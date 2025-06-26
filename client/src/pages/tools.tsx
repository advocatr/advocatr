
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Tool {
  id: number;
  title: string;
  description: string;
  downloadUrl: string;
  images: string[];
  isActive: boolean;
}

export default function ToolsPage() {
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: async () => {
      const response = await fetch('/api/tools');
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading tools...</div>
        </div>
      </Layout>
    );
  }

  const activeTools = tools.filter((tool: Tool) => tool.isActive);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-6">Tools</h1>
            <p className="text-lg text-gray-600 mb-8">
              Discover our collection of advocacy and legal tools designed to enhance your practice.
            </p>
          </div>

          {activeTools.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">No tools are currently available.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {activeTools.map((tool: Tool) => (
                <Card key={tool.id} className="overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6">
                      <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-2xl">{tool.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <CardDescription className="text-base mb-6 text-gray-700">
                          {tool.description}
                        </CardDescription>
                        <Button asChild className="w-full md:w-auto">
                          <a 
                            href={tool.downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Download Tool
                          </a>
                        </Button>
                      </CardContent>
                    </div>
                    
                    {tool.images && tool.images.length > 0 && (
                      <div className="flex items-center justify-center p-6">
                        <Carousel className="w-full max-w-md">
                          <CarouselContent>
                            {tool.images.map((image, index) => (
                              <CarouselItem key={index}>
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                  <img
                                    src={image}
                                    alt={`${tool.title} screenshot ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/api/placeholder/400/225';
                                    }}
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {tool.images.length > 1 && (
                            <>
                              <CarouselPrevious />
                              <CarouselNext />
                            </>
                          )}
                        </Carousel>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
