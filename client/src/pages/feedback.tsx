
import { Layout } from "@/components/layout";

export default function FeedbackPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Feedback</h1>
        <div className="prose max-w-none">
          <p className="text-lg mb-4">
            It is 2025 and we are in the alpha testing phase of Advocatr. We would love to hear from you on how we can improve this tool in time for the opening of the 2026 Pupillage Gateway.

            If you have time to answer any or all our feedback questions, please click this link to <a href="https://docs.google.com/forms/d/e/1FAIpQLSf3HEbv8AIU5D9nkJOSeG1UR01DLoi-uSbz8UlCkb1UrcRymg/viewform?usp=header">submit your feedback</a>

          </p>
        </div>
      </div>
    </Layout>
  );
}
