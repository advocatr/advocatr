
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ContactUsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      // Reset form
      setName("");
      setEmail("");
      setContent("");
      
      toast({
        title: "Thank you for your message",
        description: "We have received your query and will get back to you soon.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <div className="prose max-w-none mb-8">
          <p className="text-lg">
            Get in touch with the Advocatr team for support or enquiries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px]"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
