
import { Layout } from "@/components/layout";

export default function AboutPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">About Advocatr</h1>
        <h2 className="text-3xl font-bold underline mb-6">Our Story</h2>
        <div className="prose max-w-none">
          <p className="text-lg italic mb-4">
            A barrister and a tech guy walked into a bar. The barrister says to the tech guy, "I wish getting to the Bar was always this easy."
          </p>
          <p className="text-lg mb-4">
            And so, they created this platform. 
          </p>
          <p className="text-lg mb-4">
            This - with some artistic licence - is the story of why we created Advocatr. 
          </p>
          <p className="text-lg mb-4">
            Advocatr is a comprehensive platform designed to help aspiring legal professionals master their advocacy skills through structured exercises and expert guidance. Our mission is to provide accessible, high-quality advocacy training that prepares students and practitioners for real-world legal scenarios.
            Find out more on how to use Advocatr <a href="/how-to-use">here</a>.
          </p>
          <h2 className="text-3xl font-bold underline mb-6">Our Founders</h2>
          <h3 className="text-2xl font-bold mb-6">The Barrister</h3>
          <div className="flex justify-end mb-6">
            <div className="w-full md:w-48">
              <img src="/saara-profile.jpg" alt="Saara Idelbi" className="w-full rounded-lg shadow-lg"/>
            </div>
          </div>
          <p className="text-lg mb-4">
            Saara Idelbi is ranked by the Legal 500 as a 'Leading Junior' barrister in multiple areas. She is in chambers at 5 Essex and is a member of Gray's Inn, where she is also an advocacy trainer. She has built a reputation for navigating complex legal challenges with precision and clarity. Saara co-authored the
            <a href="https://www.lawbriefpublishing.com/product/damagesinhumanrightsclaims/"> Practical Guide to Non-Pecuniary Damages in Human Rights Act claims'</a>. Her advocacy has been described as carefully considered and effective, charming and tenacious, and killer. All of which reflects that advocacy is and must be adaptable, something she is keen for you to practise on Advocatr.
          </p>
          <p className="text-lg mb-4">
            You can find out more about her practice as a barrister on [link to 5 essex website] or find her on social media at [bluesky link].
          </p>
          <h3 className="text-2xl font-bold mb-6">The Tech Guy</h3>
          <div className="flex justify-start mb-6">
            <div className="w-full md:w-48">
              <img src="/jack-profile.jpg" alt="Jack Booth" className="w-full rounded-lg shadow-lg"/>
            </div>
          </div>
          <p className="text-lg mb-4">
            Jack Booth is a cyber security specialist with expertise in architecting technical solutions. He has a wealth of experience in digital start-ups, including FinTech, crowd source cyber security, educational gaming, and animation. Jack brings intellectual curiosity, practical solutions, and an uncanny ability to articulate complicated technical concepts accessibly. Having crewed at Gray's Inn in his days in audio-visual services, he understands the challenges of pupillage advocacy exercises and the pupillage application process.
          </p>
        </div>
      </div>
    </Layout>
  );
}
