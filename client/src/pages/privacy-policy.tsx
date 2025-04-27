
import { Layout } from "@/components/layout";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-dark mb-4">
              Privacy and Data Protection Policy
            </h1>
            <p className="text-neutral-dark/70 text-sm">
              Effective Date: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-neutral max-w-none text-neutral-dark/80">
            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">1. Introduction</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">1.1. In order to provide our services, Advocatr needs to collect and hold information that may include personal data.</p>
                <p className="mb-3">1.2. This Privacy and Data Protection Policy ("Privacy Policy") is meant to help you understand what information we collect, why we collect it and how you can update, manage, export and delete your information.</p>
                <p className="mb-3">1.3. We also collect information to provide better services to all our users and potentially future users.</p>
                <p className="mb-3">1.4. We will aim not to do anything that may infringe your data protection rights.</p>
                <p className="mb-3">1.5. We change this Privacy Policy from time to time. We will not reduce your rights under this Privacy Policy without your consent. If changes are significant, we'll provide a more prominent notice on the Advocatr home page.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">2. Data Controller</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">2.1. The data controller responsible for processing your information is Advocatr, the trading name for Saara Idelbi in the provision of these services.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">3. Data Collection</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">3.1. We may collect the following types of personal data:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">3.1.1. Name, email address, and other information you provide.</p>
                  <p className="mb-2">3.1.2. Login credentials (encrypted), and authentication data.</p>
                  <p className="mb-2">3.1.3. Usage data (pages visited, features used, time spent).</p>
                  <p className="mb-2">3.1.4. Performance, including video and audio, data from exercises and practice content.</p>
                  <p className="mb-2">3.1.5. Device, browser, and access time information.</p>
                  <p className="mb-2">3.1.6. Details pertaining to education and/or employment.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">4. How We Use Your Data</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">4.1. Your data is used to:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">4.1.1. Provide access to and personalise your experience with the Site.</p>
                  <p className="mb-2">4.1.2. Track progress and recommend exercises.</p>
                  <p className="mb-2">4.1.3. Respond to enquiries and support requests.</p>
                  <p className="mb-2">4.1.4. Monitor Site performance and improve functionality.</p>
                  <p className="mb-2">4.1.5. Develop further products and/or services for Advocatr.</p>
                  <p className="mb-2">4.1.6. Comply with legal obligations.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">5. Legal Bases of Processing</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">5.1. We process your information for the purposes described in this policy, based on the following legal grounds:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">5.1.1. Consent, where this is required and you have the right to withdraw your consent at any time.</p>
                  <p className="mb-2">5.1.2. The legitimate interests of my business or a third party, except where such interests are overridden by the interests, rights or freedoms of the data subject. Examples of legitimate interests include but are not limited to:</p>
                  <div className="ml-6 mb-4">
                    <p className="mb-2">5.1.2.(a) Provide, maintain and improve services to meet the needs of our users;</p>
                    <p className="mb-2">5.1.2.(b) To communicate with you – we use information that we collect, like your email address, to interact with you directly.</p>
                    <p className="mb-2">5.1.2.(c) Developing further advocacy and trial products under the Advocatr umbrella;</p>
                    <p className="mb-2">5.1.2.(d) Marketing;</p>
                    <p className="mb-2">5.1.2.(e) Compliance with regulatory requirements;</p>
                    <p className="mb-2">5.1.2.(f) Practice management and administrative tasks.</p>
                    <p className="mb-2">5.1.2.(g) Understand how people use our services to ensure and improve the performance of our services.</p>
                  </div>
                  <p className="mb-2">5.1.3. When necessary to protect the vital interests of you or another person.</p>
                  <p className="mb-2">5.1.4. Performance of a contract.</p>
                  <p className="mb-2">5.1.5. When we have a legal obligation to do so.</p>
                </div>
                <p className="mb-3">5.2. Advocatr does not invite nor encourage you to upload content process special category data. If you choose to upload content that includes special category personal data, we reserve the right to process such personal data for the establishment, exercise or defence of legal claims or whenever courts are acting in their judicial capacity.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">6. Data Sharing</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">6.1. We do not sell your personal data. We may share your data only:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">6.1.1. With trusted service providers who assist in running the Site;</p>
                  <p className="mb-2">6.1.2. As required by law, regulation, or legal process;</p>
                  <p className="mb-2">6.1.3. To protect the rights, safety, or property of Advocatr, users, or others.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">7. Cookies and Tracking</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">7.1. We may use cookies or similar technologies to:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">7.1.1. Enable core functionality of the Site;</p>
                  <p className="mb-2">7.1.2. Understand user interaction and performance;</p>
                  <p className="mb-2">7.1.3. Improve usability and features.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">8. Data Retention</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">8.1. We retain your personal data only as long as necessary for the purposes outlined above or to comply with legal obligations.</p>
                <p className="mb-3">8.2. We will typically retain personal data for 15 years, for the purposes of limitation under the Limitation Act 1980.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">9. Application</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">9.1. This Privacy Policy applies to all of the services offered by Advocatr.</p>
                <p className="mb-3">9.2. This Privacy Policy doesn't apply to:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">9.2.1. The information practices of other companies and organisations that advertise our services.</p>
                  <p className="mb-2">9.2.2. Services offered by other companies or individuals.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">10. Your Rights</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">10.1. The UK GDPR gives you specific rights in terms of your personal data. You have the right to:</p>
                <div className="ml-6 mb-4">
                  <p className="mb-2">10.1.1. Access and obtain a copy of your data;</p>
                  <p className="mb-2">10.1.2. Request correction or deletion of inaccurate or unnecessary data;</p>
                  <p className="mb-2">10.1.3. Object to or restrict certain processing activities;</p>
                  <p className="mb-2">10.1.4. Withdraw your consent at any time (where applicable);</p>
                </div>
                <p className="mb-3">10.2. To exercise these rights, contact us at the email address below.</p>
                <p className="mb-3">10.3. Finally, if you believe that we have done something irregular or improper with your personal data, you can complain to the ICO if you are unhappy with how we have processed your information or dealt with your query.</p>
                <p className="mb-3">10.4. You can find out more information from the ICO's website: <a href="http://ico.org.uk/for_the_public/personal_information" className="text-blue-600 hover:underline">http://ico.org.uk/for_the_public/personal_information</a>.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">11. Security</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">11.1. We take reasonable technical and organisational measures to protect your personal data from loss, misuse, or unauthorised access.</p>
                <p className="mb-3">11.2. No system is completely secure, but we are committed to maintaining appropriate security measures to keep your data safe.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mt-8 mb-4 text-neutral-dark">12. Contact Information</h2>
              <div className="ml-6 mb-4">
                <p className="mb-3">If you have questions about this Privacy Policy or your personal data, please contact us at: <a href="mailto:saara@advocatr.ai" className="text-blue-600 hover:underline">saara@advocatr.ai</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
