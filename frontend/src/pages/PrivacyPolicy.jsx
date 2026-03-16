import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg mb-6">
              <strong>Effective Date:</strong> March 16, 2026
            </p>

            <p className="mb-6">
              PharmForge AI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered drug discovery platform.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">1.1 Personal Information</h3>
            <p className="mb-4">
              We may collect personal information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials and authentication data</li>
              <li>Payment information (processed securely through Razorpay)</li>
              <li>Professional information (organization, role, research interests)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.2 Usage Data</h3>
            <p className="mb-4">
              We automatically collect certain information when you use our platform:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage patterns and platform interactions</li>
              <li>API usage statistics and performance metrics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.3 Research Data</h3>
            <p className="mb-4">
              For our AI drug discovery services, we process:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Protein sequences and molecular structures</li>
              <li>Generated lead compounds and predictions</li>
              <li>Research parameters and analysis results</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use collected information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and maintain our AI drug discovery platform</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails and service notifications</li>
              <li>Improve our AI models and platform performance</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Information Sharing and Disclosure</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With trusted service providers who assist our operations (under strict confidentiality agreements)</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>AES-256 encryption for data at rest and in transit</li>
              <li>Secure API communications</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
            <p className="mb-4">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. Research data may be retained longer for model improvement purposes, always in encrypted form.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to certain data processing</li>
              <li>Data portability</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience. See our Cookie Policy for detailed information.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. International Data Transfers</h2>
            <p className="mb-4">
              Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy, please contact us at privacy@pharmforge.ai or through our contact form.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}