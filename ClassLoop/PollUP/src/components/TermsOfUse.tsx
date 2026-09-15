export function TermsOfUse() {
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
            Terms of Use
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Agreement to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing or using PollUp ("Service", "Platform", "we", "us",
                or "our"), you agree to be bound by these Terms of Use. If you
                do not agree to these terms, you may not use the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms constitute a legally binding agreement between you
                and PollUp. Please read them carefully.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Description of Service
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                PollUp is a free interactive classroom application that enables
                educators and presenters to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Create polling sessions with various question types</li>
                <li>Collect real-time responses from participants</li>
                <li>Display and analyze results</li>
                <li>Manage interactive classroom activities</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service is provided free of charge for educational and
                professional use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                User Accounts and Registration
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Account Creation
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To create sessions and use certain features, you must register
                for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>
                  Notify us immediately of any unauthorized account access
                </li>
                <li>
                  Accept responsibility for all activities under your account
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Account Eligibility
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                By creating an account, you represent that:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>You are at least 18 years old, or</li>
                <li>
                  You are 13-17 years old and have parental/guardian consent, or
                </li>
                <li>
                  You are using the Service under the supervision of an
                  educator or authorized adult
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Acceptable Use
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in
                accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Use the Service in any way that violates applicable laws or
                  regulations
                </li>
                <li>
                  Upload, post, or transmit any content that is illegal,
                  harmful, threatening, abusive, harassing, defamatory, obscene,
                  or otherwise objectionable
                </li>
                <li>
                  Collect or store personal information about other users
                  without their consent
                </li>
                <li>
                  Attempt to gain unauthorized access to the Service or related
                  systems
                </li>
                <li>
                  Interfere with or disrupt the Service or servers/networks
                  connected to it
                </li>
                <li>
                  Use automated systems (bots, scripts) to access the Service
                  without permission
                </li>
                <li>
                  Impersonate another person or misrepresent your affiliation
                </li>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>
                  Attempt to reverse engineer, decompile, or disassemble any
                  part of the Service
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                User Content and Data
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Content You Submit
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you create sessions or submit responses, you retain
                ownership of your content. However, you grant us a worldwide,
                non-exclusive, royalty-free license to use, store, and process
                your content solely to provide and improve the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Data Accessibility
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong className="font-semibold">Important:</strong> All data
                submitted to a session is stored and accessible to the session
                creator. By participating in a session, you acknowledge and
                consent to the session creator's access to your responses.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Content Responsibility
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">You are solely responsible for:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  All content you create, upload, or transmit through the
                  Service
                </li>
                <li>
                  Ensuring your content does not violate these Terms or
                  applicable laws
                </li>
                <li>
                  Obtaining necessary permissions for any content you submit
                </li>
                <li>The accuracy and appropriateness of your content</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Content Removal
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to remove or disable access to any content
                that violates these Terms or that we determine, in our sole
                discretion, is harmful or inappropriate.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Session Creator Responsibilities
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you create sessions, you additionally agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Use collected data responsibly and in accordance with
                  applicable privacy laws
                </li>
                <li>
                  Inform participants about what data will be collected and how
                  it will be used
                </li>
                <li>
                  Obtain necessary consents when collecting data from minors
                </li>
                <li>
                  Protect the confidentiality of participant responses as
                  appropriate
                </li>
                <li>
                  Not share participant data with unauthorized third parties
                </li>
                <li>
                  Comply with your institution's policies regarding data
                  collection
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Intellectual Property Rights
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Our Intellectual Property
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service, including its software, design, text, graphics,
                and other content (excluding user content), is owned by PollUp
                and is protected by copyright, trademark, and other
                intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                License to Use
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We grant you a limited, non-exclusive, non-transferable,
                revocable license to access and use the Service for its
                intended purpose, subject to these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Disclaimer of Warranties
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING
                BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties that the Service will be uninterrupted, secure, or error-free</li>
                <li>Warranties regarding the accuracy or reliability of content</li>
                <li>Warranties that defects will be corrected</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You use the Service at your own risk. We do not guarantee that
                the Service will meet your requirements or be suitable for your
                specific purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                TO THE FULLEST EXTENT PERMITTED BY LAW, POLLUP AND ITS
                AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE
                FOR:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Any indirect, incidental, special, consequential, or punitive
                  damages
                </li>
                <li>Loss of profits, data, use, or goodwill</li>
                <li>Service interruptions or data loss</li>
                <li>
                  Unauthorized access to or alteration of your content
                </li>
                <li>Third-party conduct or content on the Service</li>
                <li>
                  Any damages arising from your use or inability to use the
                  Service
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                This limitation applies whether the alleged liability is based
                on contract, tort, negligence, strict liability, or any other
                basis, even if we have been advised of the possibility of such
                damages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Indemnification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree to indemnify, defend, and hold harmless PollUp and
                its affiliates, officers, employees, and agents from any
                claims, liabilities, damages, losses, and expenses (including
                reasonable attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your content or data submitted through the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Service Availability and Modifications
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  Modify, suspend, or discontinue the Service (or any part
                  thereof) at any time
                </li>
                <li>Change or remove features without notice</li>
                <li>Set usage limits or restrictions</li>
                <li>
                  Perform maintenance that may temporarily interrupt Service
                  availability
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We will not be liable to you or any third party for any
                modification, suspension, or discontinuation of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Account Termination
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Termination by You
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may terminate your account at any time by contacting us or
                using account deletion features (if available). Upon
                termination, your access to the Service will cease.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Termination by Us
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may suspend or terminate your account and access to the
                Service at any time, without prior notice or liability, for any
                reason, including if you:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Cause harm to other users or the Service</li>
                <li>Request account deletion</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Effect of Termination
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Upon termination:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Your right to use the Service immediately ceases</li>
                <li>Your account and data may be deleted</li>
                <li>
                  Provisions of these Terms that should survive termination
                  will continue to apply
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your use of the Service is also governed by our Privacy Policy,
                which is incorporated into these Terms by reference. Please
                review our{" "}
                <a
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Privacy Policy
                </a>{" "}
                to understand our data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Governing Law and Dispute Resolution
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance
                with applicable laws, without regard to conflict of law
                principles. Any disputes arising from these Terms or your use
                of the Service shall be resolved through good faith
                negotiation, and if necessary, through binding arbitration or
                in courts of competent jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Changes to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may modify these Terms at any time. We will notify you of
                material changes by:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Posting the updated Terms on this page</li>
                <li>Updating the "Last updated" date</li>
                <li>
                  Sending an email notification (for significant changes)
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your continued use of the Service after changes are posted
                constitutes acceptance of the modified Terms. If you do not
                agree to the changes, you must stop using the Service and may
                terminate your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                General Provisions
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Entire Agreement
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and PollUp regarding the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Severability
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If any provision of these Terms is found to be invalid or
                unenforceable, the remaining provisions shall remain in full
                force and effect.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Waiver
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our failure to enforce any right or provision of these Terms
                shall not constitute a waiver of such right or provision.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Assignment
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not assign or transfer these Terms or your rights
                hereunder without our prior written consent. We may assign our
                rights and obligations without restriction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="list-none mb-4 text-gray-700 space-y-2">
                <li>
                  <strong className="font-semibold">Email:</strong>{" "}
                  legal@pollup.app
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

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Acknowledgment
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE
                TERMS OF USE AND AGREE TO BE BOUND BY THEM.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

