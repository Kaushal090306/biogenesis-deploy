export default async function handler(req, res) {
  const spaceUrl = process.env.HF_SPACE_URL
  const spaceToken = process.env.HF_SPACE_TOKEN

  if (!spaceUrl || !spaceToken) {
    return res.status(500).json({
      detail: 'Vercel proxy is missing HF_SPACE_URL or HF_SPACE_TOKEN.',
    })
  }

  const pathParam = req.query.path
  const pathSegments = Array.isArray(pathParam)
    ? pathParam
    : pathParam
      ? [pathParam]
      : []

  const target = new URL(spaceUrl)
  const relativePath = pathSegments.join('/')
  target.pathname = relativePath === 'health' ? '/health' : `/api/${relativePath}`

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      for (const item of value) target.searchParams.append(key, String(item))
    } else if (value !== undefined) {
      target.searchParams.append(key, String(value))
    }
  }

  const incomingAuth = req.headers.authorization
  const userAuthHeader = req.headers['x-user-authorization'] || incomingAuth
  const userTokenHeader = req.headers['x-user-token'] || (
    incomingAuth && incomingAuth.toLowerCase().startsWith('bearer ')
      ? incomingAuth.slice(7).trim()
      : undefined
  )

  const headers = {
    Authorization: `Bearer ${spaceToken}`,
    Accept: req.headers.accept || 'application/json',
  }

  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }
  if (userAuthHeader) {
    headers['X-User-Authorization'] = String(userAuthHeader)
  }
  if (userTokenHeader) {
    headers['X-User-Token'] = String(userTokenHeader)
  }

  const method = req.method || 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'

  let body
  if (hasBody) {
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      body = req.body
    } else if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body)
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }
  }

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
    })

    res.status(upstream.status)

    const contentType = upstream.headers.get('content-type')
    if (contentType) {
      res.setHeader('content-type', contentType)
    }

    const location = upstream.headers.get('location')
    if (location) {
      res.setHeader('location', location)
    }

    const processTime = upstream.headers.get('x-process-time-ms')
    if (processTime) {
      res.setHeader('x-process-time-ms', processTime)
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      return res.end()
    }

    const text = await upstream.text()
    return res.send(text)
  } catch (error) {
    return res.status(502).json({
      detail: 'Failed to reach backend space from Vercel proxy.',
      error: error instanceof Error ? error.message : 'Unknown proxy error',
    })
  }
}
