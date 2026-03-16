import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function CookiePolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-brand-400 hover:text-brand-300 mb-8 transition-colors"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </motion.button>

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h1 className="text-4xl font-bold mb-8 text-center">Cookie Policy</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg mb-6">
              <strong>Effective Date:</strong> March 16, 2026
            </p>

            <p className="mb-6">
              This Cookie Policy explains how PharmForge AI uses cookies and similar technologies to enhance your experience on our platform.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
            <p className="mb-4">
              Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better browsing experience by remembering your preferences and understanding how you use our platform.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Types of Cookies We Use</h2>

            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Essential Cookies</h3>
            <p className="mb-4">
              These cookies are necessary for the website to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>User authentication and session management</li>
              <li>Security features and fraud prevention</li>
              <li>Load balancing and server optimization</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Functional Cookies</h3>
            <p className="mb-4">
              These cookies enhance your experience by remembering your preferences:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Language and display preferences</li>
              <li>Theme settings (light/dark mode)</li>
              <li>Form data preservation</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Analytics Cookies</h3>
            <p className="mb-4">
              We use analytics cookies to understand how users interact with our platform:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Page views and user journey tracking</li>
              <li>Feature usage statistics</li>
              <li>Performance metrics and error reporting</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.4 Marketing Cookies</h3>
            <p className="mb-4">
              These cookies help us deliver relevant content and measure campaign effectiveness:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Referral source tracking</li>
              <li>Campaign performance measurement</li>
              <li>User engagement analytics</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Third-Party Cookies</h2>
            <p className="mb-4">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Google Analytics:</strong> For website analytics and user behavior insights</li>
              <li><strong>Razorpay:</strong> For secure payment processing</li>
              <li><strong>Formspree:</strong> For contact form submissions</li>
              <li><strong>Hugging Face:</strong> For AI model hosting and inference</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Cookie Management</h2>
            <p className="mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Browser settings to block or delete cookies</li>
              <li>Opt-out links provided by third-party services</li>
              <li>Contact us to disable non-essential cookies</li>
            </ul>
            <p className="mb-4">
              Note: Disabling essential cookies may affect platform functionality.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookie Retention</h2>
            <p className="mb-4">
              Cookies have different lifespans depending on their purpose:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent Cookies:</strong> Remain until deleted or expired (typically 30 days to 2 years)</li>
              <li><strong>Essential Cookies:</strong> May persist longer for security purposes</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Collection and Privacy</h2>
            <p className="mb-4">
              The data collected through cookies is subject to our Privacy Policy. We use this information to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Improve website performance and user experience</li>
              <li>Analyze usage patterns and platform effectiveness</li>
              <li>Provide personalized content and recommendations</li>
              <li>Ensure platform security and prevent abuse</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Do Not Track Signals</h2>
            <p className="mb-4">
              We respect Do Not Track (DNT) signals sent by your browser. When we detect a DNT signal, we disable non-essential tracking cookies and limit data collection to essential functionality only.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Mobile Applications</h2>
            <p className="mb-4">
              If we develop mobile applications in the future, similar tracking technologies may be used. These will be disclosed in the app's privacy policy and settings.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Updates to This Policy</h2>
            <p className="mb-4">
              We may update this Cookie Policy periodically to reflect changes in our practices or for legal compliance. Significant changes will be communicated via email or platform notification.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have questions about our use of cookies or this policy, please contact us:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Email: privacy@pharmforge.ai</li>
              <li>Subject: Cookie Policy Inquiry</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}