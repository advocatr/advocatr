
import { Layout } from "@/components/layout";

export default function AdvocacyResourcesPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-6">Advocacy and Pupillage Resources</h1>
          </div>

          <section className="space-y-6">
            <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-6">Professional Organisations</h3>
            <div className="grid gap-3">
              <a 
                href="https://www.barcouncil.org.uk/becoming-a-barrister.html"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Bar Council
              </a>
              <a 
                href="https://www.barstandardsboard.org.uk/training-qualification/becoming-a-barrister.html"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Bar Standards Board
              </a>
              <a 
                href="https://www.graysinn.org.uk/education/"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Gray's Inn
              </a>
              <a 
                href="https://www.innertemple.org.uk/becoming-a-barrister/"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Inner Temple
              </a>
              <a 
                href="https://www.lincolnsinn.org.uk/becoming-barrister/"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Lincoln's Inn
              </a>
              <a 
                href="https://www.middletemple.org.uk/"
                className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
              >
                Middle Temple
              </a>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-6">Books</h3>
            <div className="space-y-3">
              <div>
                <span className="text-lg">Iain Morley QC (now KC), </span>
                <a 
                  href="https://amzn.eu/d/7YAN4hP"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  The Devil's Advocate (3rd Edition, 2015)
                </a>
              </div>
              <div>
                <span className="text-lg">Philip Meyer, </span>
                <a 
                  href="https://amzn.eu/d/87Yw2XL"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  Storytelling for Lawyers (2014)
                </a>
              </div>
              <div>
                <span className="text-lg">Justice Antonin Scalia and Bryan A. Garner, </span>
                <a 
                  href="https://amzn.eu/d/by2HQUb"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  Making your Case: The Art of Persuading Judges (2009)
                </a>
              </div>
              <div>
                <span className="text-lg">Georgina Wolfe, </span>
                <a 
                  href="https://amzn.eu/d/exWjZE8"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  The Path to Pupillage: A Guide for the Aspiring Barrister (2013)
                </a>
              </div>
              <div>
                <span className="text-lg">Tomas McCabe, </span>
                <a 
                  href="https://amzn.eu/d/jhRq1iF"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  Get Pupillage (2nd Edition, 2024)
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-6">Podcasts</h3>
            <div className="space-y-3">
              <div>
                <span className="text-lg">Georgina Wolfe and Beatrice Collier, The Pupillage Podcast on </span>
                <a 
                  href="https://open.spotify.com/show/3zwLF5UkU0HfhxV82GlIyz"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  Spotify
                </a>
                <span className="text-lg"> and </span>
                <a 
                  href="https://podcasts.apple.com/gb/podcast/the-pupillage-podcast/id1448140217"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  Apple
                </a>
              </div>
              <div>
                <span className="text-lg">Bibi Badejo, </span>
                <a 
                  href="https://www.theadvocacypodcast.com/episodes/"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 text-lg"
                >
                  The Advocacy Podcast
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
