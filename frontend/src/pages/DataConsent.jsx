import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function DataConsent() {
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
          <h1 className="text-4xl font-bold mb-8 text-center">Data Consent Agreement</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg mb-6">
              <strong>Effective Date:</strong> March 16, 2026
            </p>

            <p className="mb-6">
              This Data Consent Agreement ("Agreement") outlines how PharmForge AI collects, uses, and protects your data. By using our platform, you consent to the practices described herein.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Purpose of Data Collection</h2>
            <p className="mb-4">
              We collect and process your data to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide AI-powered drug discovery services</li>
              <li>Improve our machine learning models</li>
              <li>Ensure platform security and compliance</li>
              <li>Deliver personalized user experiences</li>
              <li>Process payments and manage subscriptions</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Types of Data Collected</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Personal Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Full name and contact information</li>
              <li>Email address and phone number</li>
              <li>Professional affiliation and research interests</li>
              <li>Payment and billing information</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Research Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Protein sequences and molecular structures</li>
              <li>Experimental parameters and conditions</li>
              <li>Generated compounds and predictions</li>
              <li>Analysis results and reports</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Technical Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Usage patterns and interaction data</li>
              <li>Cookies and tracking information</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Processing and Storage</h2>
            <p className="mb-4">
              Your data is processed and stored using industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>AES-256 encryption for data at rest</li>
              <li>TLS 1.3 encryption for data in transit</li>
              <li>Secure cloud infrastructure with access controls</li>
              <li>Regular security audits and compliance checks</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Usage for AI Improvement</h2>
            <p className="mb-4">
              With your consent, anonymized research data may be used to improve our AI models. This includes:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Training data for machine learning algorithms</li>
              <li>Model validation and performance testing</li>
              <li>Development of new AI capabilities</li>
            </ul>
            <p className="mb-4">
              All data used for AI improvement is fully anonymized and cannot be traced back to individual users.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Sharing and Third Parties</h2>
            <p className="mb-4">
              We do not sell your personal data. Data may be shared only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal requirements</li>
              <li>With trusted service providers under strict confidentiality</li>
              <li>For platform security and fraud prevention</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
            <p className="mb-4">
              We retain your data according to the following schedule:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Personal data: As long as your account is active plus 7 years for legal compliance</li>
              <li>Research data: Indefinitely for AI improvement (anonymized)</li>
              <li>Payment data: 7 years for financial compliance</li>
              <li>Technical logs: 90 days for security and debugging</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Data Rights</h2>
            <p className="mb-4">You have the following rights regarding your data:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to certain data processing activities</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Consent Withdrawal</h2>
            <p className="mb-4">
              You may withdraw your consent for data processing at any time by contacting us. However, withdrawal may affect your ability to use certain platform features.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. International Data Transfers</h2>
            <p className="mb-4">
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for all international transfers.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Data Security Measures</h2>
            <p className="mb-4">
              We implement comprehensive security measures including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Multi-factor authentication for accounts</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Employee training on data protection</li>
              <li>Incident response and breach notification procedures</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Children's Privacy</h2>
            <p className="mb-4">
              Our services are not intended for children under 18. We do not knowingly collect personal information from children under 18.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Changes to This Agreement</h2>
            <p className="mb-4">
              We may update this Data Consent Agreement periodically. Significant changes will be communicated via email or platform notification.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact Information</h2>
            <p className="mb-4">
              For questions about this Data Consent Agreement or to exercise your data rights, please contact us at:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Email: privacy@pharmforge.ai</li>
              <li>Phone: +91-XXXXXXXXXX</li>
              <li>Address: [Your Business Address]</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Governing Law</h2>
            <p className="mb-4">
              This Agreement is governed by the laws of India and subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}