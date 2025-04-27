
import { Layout } from "@/components/layout";

export default function AdvocacyResourcesPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Advocacy and Pupillage Resources</h1>
        <div className="prose max-w-none">
          <h3 className="text-2xl font-bold mb-6"> Professional Organisations</h3>
            <p className="text-lg mb-4">
          

            Bar Council: https://www.barcouncil.org.uk/becoming-a-barrister.html
            <br></br>  
            Bar Standards Board: https://www.barstandardsboard.org.uk/training-qualification/becoming-a-barrister.html
            <br></br>
            Gray’s Inn: https://www.graysinn.org.uk/education/
            <br></br>
            Inner Temple: https://www.innertemple.org.uk/becoming-a-barrister/
            <br></br>
            Lincoln’s Inn:https://www.lincolnsinn.org.uk/becoming-barrister/
            <br></br>
            Middle Temple: https://www.middletemple.org.uk/
            </p>

            <h3 className="text-2xl font-bold mb-6"> Books</h3>
              <p className="text-lg mb-4">

            Iain Morley QC (now KC), The Devil’s Advocate (3rd Edition, 2015) https://amzn.eu/d/7YAN4hP
            <br></br>
            Philip Meyer, Storytelling for Lawyers (2014) https://amzn.eu/d/87Yw2XL
            <br></br>
            Justice Antonin Scalia and Bryan A. Garner, Making your Case: The Art of Persuading Judges (2009) https://amzn.eu/d/by2HQUb
            <br></br>               
            Georgina Wolfe, The Path to Pupillage: A Guide for the Aspiring Barrister (2013) https://amzn.eu/d/exWjZE8
            <br></br>
            Tomas McCabe, Get Pupillage (2nd Edition, 2024) https://amzn.eu/d/jhRq1iF
              </p>
            <h3 className="text-2xl font-bold mb-6"> Podcasts</h3>
              <p className="text-lg mb-4">
            Georgina Wolfe and Beatrice Collier, The Pupillage Podcast on <a href="https://open.spotify.com/show/3zwLF5UkU0HfhxV82GlIyz">Spotify</a> and <a href="https://podcasts.apple.com/gb/podcast/the-pupillage-podcast/id1448140217">Apple</a> 
            <br></br>
            Bibi Badejo, The Advocacy Podcast https://www.theadvocacypodcast.com/episodes/
              </p>
        </div>
      </div>
    </Layout>
  );
}
