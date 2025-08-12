
import { Layout } from "@/components/layout";

export default function TermsAndConditionsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-neutral max-w-none text-neutral-dark/80">
            <h1 className="text-3xl font-bold text-neutral-dark mb-6">TERMS OF USE</h1>
            <p className="text-neutral-dark/70 text-sm mb-8">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">1. INTRODUCTION</h2>
              <div className="ml-6 space-y-3">
                <p>
                  1.1. Welcome to <strong>Advocatr</strong> (the "<strong>Site</strong>"), a platform currently in <strong>alpha testing</strong> offering <strong>advocacy improvement and related educational content</strong> ("<strong>Services</strong>"). Where these terms refer to "<strong>you</strong>", it is referring to the user or viewer of this Site. The website is owned by Saara Idelbi. If you do not agree, do not use the Site.
                </p>
                <p>
                  1.2. By accessing or using the Site, you agree to these Terms of Use ("<strong>Terms</strong>"). Please read these Terms of Use carefully before you start to use the Site, as these will apply to your use of the Site. You confirm that you accept these Terms and that you will comply with these Terms, by using this Site. "<strong>Use</strong>"/"<strong>Using</strong>" includes: viewing, downloading, capturing, uploading, and/or any other interaction with the Site (including interacting with the Site's content at a later point whether on or offline, e.g. screenshotting a page to read later).
                </p>
                <p>
                  1.3. We may revise these Terms at any time by amending this page. Please check this page from time to time to take notice of any changes we made, as they are binding on you.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">2. ALPHA TESTING NOTICE</h2>
              <div className="ml-6">
                <p>
                  2.1. The Site is in <strong>alpha testing</strong>, provided on an <strong>experimental and temporary basis</strong>. Features, availability, and content may change or be withdrawn at any time without notice.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">3. USE OF THE SITE</h2>
              <div className="ml-6 space-y-4">
                <p>
                  3.1. We do not guarantee that the Site, or any content on it, will always be available or be uninterrupted. Access to our Website is permitted on a temporary basis. We may suspend, withdraw, discontinue or change all or any part of the Site without notice. We will not be liable to you if for any reason the Site is unavailable at any time or for any period.
                </p>
                <p>
                  3.2. You may use the Site solely for personal, non-commercial, educational purposes. You must not:
                </p>
                <div className="ml-6 space-y-1">
                  <p>3.2.1. Use the Site in any unlawful or misleading manner;</p>
                  <p>3.2.2. Copy, reproduce, or redistribute Site content without express permission;</p>
                  <p>3.2.3. Attempt to gain unauthorised access to the Site or its related systems.</p>
                </div>
                <p>
                  3.3. You must not abuse, harm, interfere with or disrupt our services or systems – for example, by:
                </p>
                <div className="ml-6 space-y-1">
                  <p>3.3.1. introducing malware.</p>
                  <p>3.3.2. spamming, hacking or bypassing our systems or protective measures.</p>
                  <p>3.3.3. jailbreaking, adversarial prompting or prompt injection.</p>
                  <p>3.3.4. accessing or using our services or content in fraudulent or deceptive ways, such as:</p>
                  <div className="ml-6 space-y-1">
                    <p>3.3.4.(a) phishing.</p>
                    <p>3.3.4.(b) creating fake accounts or content, including fake reviews.</p>
                    <p>3.3.4.(c)providing goods/services/processes/content that appear to originate from you (or someone else) when they actually originate from the Site.</p>
                  </div>
                  <p>3.3.5. providing services that appear to originate from us when they do not.</p>
                  <p>3.3.6. using our services (including the content) to violate anyone's legal rights, such as intellectual property or privacy rights.</p>
                  <p>3.3.7. reverse engineering our services, to extract trade secrets or other proprietary information, except as allowed by applicable law.</p>
                  <p>3.3.8. using content from our services to develop machine learning models or related AI technology.</p>
                  <p>3.3.9. hiding or misrepresenting who you are in order to violate these terms</p>
                  <p>3.3.10. providing services that encourage others to violate these terms.</p>
                </div>
                <p>
                  3.4. Without limiting our other rights, we may suspend or terminate your access to the Site or delete your account if:
                </p>
                <div className="ml-6 space-y-1">
                  <p>3.4.1. you materially or repeatedly breach these terms</p>
                  <p>3.4.2. we're required to do so to comply with a legal requirement or a court order</p>
                  <p>3.4.3. we reasonably believe that your conduct causes harm or liability to a user, third party or Advocatr – for example, by hacking, phishing, harassing, spamming, misleading others or scraping content that doesn't belong to you.</p>
                </div>
                <p>
                  3.5. You are always free to stop using our services at any time. If you do stop using a service, we'd appreciate knowing why so that we can continue improving our service through our feedback function here.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">4. ACCOUNT AND LOGIN INFORMATION</h2>
              <div className="ml-6 space-y-3">
                <p>
                  4.1. If you create an account, you are responsible for maintaining the <strong>confidentiality of your login information</strong>, including your password, and for all activity that occurs under your account. You agree to:
                </p>
                <div className="ml-6 space-y-1">
                  <p>4.1.1. Notify us immediately of any unauthorised access or use.</p>
                  <p>4.1.2. Not share your login credentials with anyone else.</p>
                  <p>4.1.3. Ensure that you log out from your account at the end of each session.</p>
                </div>
                <p>
                  4.2. We are not liable for any loss or damage arising from your failure to comply with these obligations.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">5. USER DATA AND PRIVACY</h2>
              <div className="ml-6 space-y-3">
                <p>
                  5.1. The Site is designed to let you upload, submit, store, send, receive or share your content. You have no obligation to provide any content to our services. You are free to choose the content that you want to provide. If you choose to upload or share content, please make sure that you have the necessary rights to do so and that the content is lawful and does not involve harmful content/nudity/sexual activity/activity beyond the remit of a legal advocacy content.
                </p>
                <p>
                  5.2. By using the Site, you agree to the collection and use of your data in accordance with our <strong>Privacy Policy</strong> (linked separately).
                </p>
                <p>
                  5.3. We may collect and process certain data, such as:
                </p>
                <div className="ml-6 space-y-1">
                  <p>5.3.1. Registration and login information;</p>
                  <p>5.3.2. Progress and performance data on exercises, including the submissions uploaded;</p>
                  <p>5.3.3. Technical usage information (e.g. device/browser type, access times).</p>
                </div>
                <p>
                  5.4. All personal data is handled in accordance with applicable <strong>UK data protection laws</strong>, including the <strong>UK GDPR</strong> and <strong>Data Protection Act 2018</strong>. We will not sell or share your personal data with third parties except as required by law, as necessary for the operation of the Site, or in the limited circumstances outlined in our Privacy Policy.
                </p>
                <p>
                  5.5. If we reasonably believe that any of your content (1) breaches these terms, (2) violates applicable law, or (3) could harm our users or third parties, then we reserve the right to remove such content from the Site and/or provide such content to the appropriate law enforcement authorities, in accordance with applicable law.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">6. PRODUCT DEVELOPMENT</h2>
              <div className="ml-6 space-y-3">
                <p>
                  6.1. We're constantly developing new technologies and features to improve our services. As part of this continual improvement, we sometimes add or remove features and functionalities, increase or decrease limits to our services, and start offering new services or stop offering old ones.
                </p>
                <p>
                  6.2. We only change or stop offering services for valid reasons, such as to improve performance or security, to comply with law, to prevent illegal activities or abuse, to reflect technical developments or because a feature or an entire service is no longer popular enough or economical to offer.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">7. INTELLECTUAL PROPERTY</h2>
              <div className="ml-6">
                <p>
                  7.1. All Site content, including exercises, graphics, and branding, is the property of Advocatr or its owners. You may not reproduce or use it for commercial purposes without permission.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">8. NO LIABILITY</h2>
              <div className="ml-6 space-y-3">
                <p>
                  8.1. <strong>To the fullest extent permitted by law</strong>, Advocatr accepts <strong>no liability</strong> for:
                </p>
                <div className="ml-6 space-y-1">
                  <p>8.1.1. Loss, damage, or inconvenience from use of or reliance on the Site or its content;</p>
                  <p>8.1.2. Any inaccuracies, omissions, or errors in exercises or materials;</p>
                  <p>8.1.3. Downtime, service interruptions, or technical issues; and/or</p>
                  <p>8.1.4. External links or third-party content.</p>
                </div>
                <p>
                  8.2. All use is <strong>at your own risk</strong>.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">9. NO PROFESSIONAL ADVICE</h2>
              <div className="ml-6">
                <p>
                  9.1. All content is for <strong>informational and practice purposes only</strong> and does not constitute professional, legal, educational, or career advice. You should not rely solely on the Site in making important decisions.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">10. CHANGES TO THESE TERMS</h2>
              <div className="ml-6">
                <p>
                  10.1. We may update these Terms from time to time. Any changes will be posted on this page with an updated effective date. Continued use of the Site after changes are made signifies your acceptance.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">11. GOVERNING LAW</h2>
              <div className="ml-6">
                <p>
                  11.1. These Terms shall be governed by and construed in accordance with the laws of <strong>England and Wales</strong>. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-neutral-dark mb-4">12. CONTACT US</h2>
              <div className="ml-6">
                <p>
                  12.1. If you have questions or concerns about these Terms or the Site, contact: <strong>Email:</strong> <a href="mailto:info@advocatr.com" className="text-blue-600 hover:underline">info@advocatr.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
