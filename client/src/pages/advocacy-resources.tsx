
import { Layout } from "@/components/layout";

export default function AdvocacyResourcesPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Advocacy and Pupillage Resources</h1>
        <div className="prose max-w-none">
          <h3 className="text-2xl font-bold mb-6"> Professional Organisations</h3>
            <p className="text-lg mb-4">
          

            <a href="https://www.barcouncil.org.uk/becoming-a-barrister.html">Bar Council</a>
            <br></br>
            <a href="https://www.barstandardsboard.org.uk/training-qualification/becoming-a-barrister.html">Bar Standards Board</a>
            <br></br>
             <a href="https://www.graysinn.org.uk/education/">Gray’s Inn</a>
            <br></br>
             <a href="https://www.innertemple.org.uk/becoming-a-barrister/">Inner Temple</a>
            <br></br>
              <a href="https://www.lincolnsinn.org.uk/becoming-barrister/">Lincoln’s Inn</a> 
            <br></br>
            <a href="https://www.middletemple.org.uk/">Middle Temple</a> 
            </p>

            <h3 className="text-2xl font-bold mb-6"> Books</h3>
              <p className="text-lg mb-4">

            Iain Morley QC (now KC), <a href="https://amzn.eu/d/7YAN4hP">The Devil’s Advocate (3rd Edition, 2015)</a> 
            <br></br>
            Philip Meyer,<a href="https://amzn.eu/d/87Yw2XL"> Storytelling for Lawyers (2014)</a>
            <br></br>
            Justice Antonin Scalia and Bryan A. Garner, <a href="https://amzn.eu/d/by2HQUb">Making your Case: The Art of Persuading Judges (2009)</a>
            <br></br>               
            Georgina Wolfe, <a href="https://amzn.eu/d/exWjZE8">The Path to Pupillage: A Guide for the Aspiring Barrister (2013)</a>
            <br></br>
            Tomas McCabe,  <a href="https://amzn.eu/d/jhRq1iF">Get Pupillage (2nd Edition, 2024)</a>
              </p>
            <h3 className="text-2xl font-bold mb-6"> Podcasts</h3>
              <p className="text-lg mb-4">
            Georgina Wolfe and Beatrice Collier, The Pupillage Podcast on <a href="https://open.spotify.com/show/3zwLF5UkU0HfhxV82GlIyz">Spotify</a> and <a href="https://podcasts.apple.com/gb/podcast/the-pupillage-podcast/id1448140217">Apple</a> 
            <br></br>
            Bibi Badejo,  <a href="https://www.theadvocacypodcast.com/episodes/">The Advocacy Podcast</a>
              </p>
        </div>
      </div>
    </Layout>
  );
}
