
import { Layout } from "@/components/layout";

export default function AboutPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-6">About Advocatr</h1>
          </div>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold border-b border-gray-200 pb-2 mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none space-y-4">
              <p className="text-lg italic text-muted-foreground text-justify">
                A barrister and a tech guy walked into a bar. The barrister says to the tech guy, "I wish getting to the Bar was always this easy."
              </p>
              <p className="text-lg text-justify">
                And so, they created this platform.
              </p>
              <p className="text-lg text-justify">
                This - with some artistic licence - is the story of why we created Advocatr.
              </p>
              <p className="text-lg text-justify">
                Advocatr is a comprehensive platform designed to help aspiring legal professionals master their advocacy skills through structured exercises and expert guidance. Our mission is to provide accessible, high-quality advocacy training that prepares students and practitioners for real-world legal scenarios.
                Find out more on how to use Advocatr{" "}
                <a href="/how-to-use" className="text-primary hover:text-primary/80 underline underline-offset-4">
                  here
                </a>
                .
              </p>
            </div>
          </section>

          <section className="space-y-8">
            <h2 className="text-3xl font-bold border-b border-gray-200 pb-2 mb-6">Our Founders</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">The Barrister</h3>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img 
                      src="/saara-profile.jpg" 
                      alt="Saara Idelbi" 
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                  <div className="md:w-2/3 space-y-4">
                    <p className="text-lg text-justify">
                      Saara Idelbi is ranked by the Legal 500 as a 'Leading Junior' barrister in multiple areas. She is a tenant at 5 Essex Chambers and is a member of Gray's Inn, where she is also an advocacy trainer. She has built a reputation for navigating complex legal challenges with precision and clarity. Saara co-authored the{" "}
                      <a 
                        href="https://www.lawbriefpublishing.com/product/damagesinhumanrightsclaims/" 
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        Practical Guide to Non-Pecuniary Damages in Human Rights Act claims
                      </a>
                      . Her advocacy has been described as carefully considered and effective, charming and tenacious, and killer. All of which reflects that advocacy is and must be adaptable, something she is keen for you to practise on Advocatr.
                    </p>
                    <p className="text-lg text-justify">
                      You can find out more about her practice as a barrister{" "}
                      <a 
                        href="https://www.39essex.com/profile/saara-idelbi" 
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        here
                      </a>
                      {" "}or find her on social media{" "}
                      <a 
                        href="https://bsky.app/profile/saaraly.bsky.social." 
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        here
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6">The Tech Guy</h3>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img 
                      src="/jack-profile.jpg" 
                      alt="Jack Booth" 
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                  <div className="md:w-2/3">
                    <p className="text-lg text-justify">
                      Jack Booth is a cyber security specialist with expertise in architecting technical solutions. He has a wealth of experience in digital start-ups, including FinTech, crowd source cyber security, educational gaming, and animation. Jack brings intellectual curiosity, practical solutions, and an uncanny ability to articulate complicated technical concepts accessibly. Having crewed at Gray's Inn in his days in audio-visual services, he understands the challenges of pupillage advocacy exercises and the pupillage application process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
