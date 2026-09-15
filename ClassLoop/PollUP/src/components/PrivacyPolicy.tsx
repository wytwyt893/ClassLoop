export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Home
            </a>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Introduction
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to PollUp. This Privacy Policy explains how we collect,
                use, and protect your information when you use our interactive
                classroom polling application. We are committed to protecting
                your privacy and ensuring transparency about our data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Information We Collect
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Account Information
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Email address for authentication</li>
                <li>Display name (if provided)</li>
                <li>Authentication credentials</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Session and Response Data
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you create or participate in sessions, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Session details (title, description, elements)</li>
                <li>Participant responses to polls, questions, and activities</li>
                <li>Timestamps of submissions</li>
                <li>
                  Participant identifiers (session-specific, not linked to
                  personal accounts)
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Usage Information
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We automatically collect certain information about your device
                and how you interact with our service:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Device type and browser information</li>
                <li>IP address</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  To provide and maintain the PollUp service and its features
                </li>
                <li>
                  To enable session creators to view and analyze responses from
                  participants
                </li>
                <li>To authenticate users and manage accounts</li>
                <li>
                  To improve our service and develop new features based on usage
                  patterns
                </li>
                <li>
                  To communicate with you about service updates or issues
                </li>
                <li>To ensure security and prevent fraud or abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Data Access and Sharing
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Session Creators
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong className="font-semibold">
                  Important: Session creators have full access to all responses
                  submitted by participants in their sessions.
                </strong>{" "}
                This includes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>All response content (text, selections, ratings, etc.)</li>
                <li>Timestamps of submissions</li>
                <li>Response metadata</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Participants should only submit information they are comfortable
                sharing with the session creator.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Third-Party Service Providers
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use trusted third-party services to operate our platform:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong className="font-semibold">Convex:</strong> Database
                  and backend services for data storage and processing
                </li>
                <li>
                  <strong className="font-semibold">Authentication provider:</strong>{" "}
                  For secure user authentication
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                These providers are bound by strict confidentiality agreements
                and are only permitted to use your data to provide services to
                us.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                We Do Not Sell Your Data
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell, rent, or trade your personal information to
                third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Data Storage and Security
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your data is stored securely using industry-standard practices:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure database storage with access controls</li>
                <li>Regular security audits and updates</li>
                <li>Limited employee access on a need-to-know basis</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                While we take reasonable measures to protect your information,
                no method of transmission over the internet or electronic
                storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Data Retention
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your information for as long as necessary to provide
                our services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Account information is retained until you delete your account
                </li>
                <li>
                  Session data is retained as long as the session exists and is
                  not deleted by the creator
                </li>
                <li>
                  Response data is retained as long as the associated session
                  exists
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Your Rights and Choices
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the following rights regarding your data:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong className="font-semibold">Access:</strong> Request a
                  copy of your personal data
                </li>
                <li>
                  <strong className="font-semibold">Correction:</strong> Update
                  or correct inaccurate information
                </li>
                <li>
                  <strong className="font-semibold">Deletion:</strong> Request
                  deletion of your account and associated data
                </li>
                <li>
                  <strong className="font-semibold">Export:</strong> Request an
                  export of your data in a portable format
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                To exercise these rights or for questions about your data,
                please contact us using the information in the Contact section
                below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Children's Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                PollUp is intended for educational use and may be used by
                students. When used in educational settings, we recommend that
                educators:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Obtain appropriate consent from parents/guardians as required
                  by applicable laws
                </li>
                <li>
                  Avoid collecting unnecessary personal information from students
                </li>
                <li>Instruct students not to include personal information in their responses</li>
                <li>
                  Review and comply with their institution's privacy policies
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Posting the updated policy on this page</li>
                <li>Updating the "Last updated" date at the top</li>
                <li>
                  Sending an email notification for significant changes (if you
                  have an account)
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your continued use of PollUp after changes are posted
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions, concerns, or requests regarding this
                Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="list-none mb-4 text-gray-700 space-y-2">
                <li>
                  <strong className="font-semibold">Email:</strong>{" "}
                  privacy@pollup.app
                </li>
                <li>
                  <strong className="font-semibold">GitHub Issues:</strong>{" "}
                  <a
                    href="https://github.com/JonasWeinert/PollUP/issues"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Report an issue
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

