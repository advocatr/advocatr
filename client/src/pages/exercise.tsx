import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import VideoPlayer from "@/components/video-player";
import VideoRecorder from "@/components/video-recorder";
import FeedbackForm from "@/components/feedback-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Check, MessageCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface Exercise {
  id: number;
  title: string;
  description: string;
  demoVideoUrl: string;
  professionalAnswerUrl: string;
}

interface Progress {
  id: number;
  videoUrl: string | null;
  completed: boolean;
  feedback: Feedback[];
}

interface AIFeedback {
  id: number;
  progressId: number;
  content: string;
  rating: number;
  isAiGenerated: boolean;
  aiAnalysisStatus: "pending" | "processing" | "completed" | "failed";
  aiConfidenceScore: number | null;
  createdAt: string;
}

interface Feedback {
  id: number;
  content: string;
  rating: number;
  createdAt: string;
  isAiGenerated?: boolean;
  aiAnalysisStatus?: "pending" | "processing" | "completed" | "failed";
  aiConfidenceScore?: number | null;
}

export default function Exercise() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProfessionalAnswer, setShowProfessionalAnswer] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const { data: exercise } = useQuery<Exercise>({
    queryKey: ["/api/exercises", id],
    queryFn: async () => {
      const response = await fetch(`/api/exercises/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch exercise");
      }
      return response.json();
    },
  });

  const { data: progress, refetch: refetchProgress } = useQuery<Progress>({
    queryKey: ["/api/progress", id],
    queryFn: async () => {
      const response = await fetch(`/api/progress/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch progress");
      }
      return response.json();
    },
  });

  // Fetch AI feedback for this progress
  const { data: aiFeedback, refetch: refetchAiFeedback } = useQuery({
    queryKey: ["/api/ai-feedback", progress?.id],
    queryFn: async () => {
      if (!progress?.id) return null;
      const response = await fetch(`/api/ai-feedback/${progress.id}/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch AI feedback");
      }
      return response.json();
    },
    enabled: !!progress?.id,
    refetchInterval: (data) => {
      // Refetch every 3 seconds if AI analysis is processing
      return data?.aiAnalysisStatus === "processing" ? 3000 : false;
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulating upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(i);
      }

      const response = await fetch(`/api/progress/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videoUrl: URL.createObjectURL(formData.get("video") as File),
          completed: true 
        }),
      });

      if (!response.ok) throw new Error("Failed to update progress");
      return response.json();
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Video uploaded successfully" });
      await refetchProgress();
      setShowProfessionalAnswer(true);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
      setUploadProgress(0);
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ videoUrl, completed }: { videoUrl: string; completed: boolean }) => {
      const response = await fetch(`/api/progress/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, completed }),
      });

      if (!response.ok) throw new Error("Failed to update progress");
      return response.json();
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Recording saved successfully" });
      await refetchProgress();
      setShowProfessionalAnswer(true);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const formData = new FormData();
    formData.append("video", e.target.files[0]);
    mutation.mutate(formData);
  };

  if (!exercise) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">{exercise.title}</h1>
        <p className="text-gray-600 mb-8">{exercise.description}</p>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Exercise Demo</h2>
            <VideoPlayer url={exercise.demoVideoUrl} />
            {exercise.pdfUrl && (
              <div className="mt-4">
                <Button
                  onClick={() => {
                    // If it's a Google Drive link, open in new tab
                    if (exercise.pdfUrl.includes('drive.google.com')) {
                      window.open(exercise.pdfUrl, '_blank');
                    } else {
                      setShowPdf(!showPdf);
                    }
                  }}
                  className="mb-4"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Materials
                </Button>
                {showPdf && !exercise.pdfUrl.includes('drive.google.com') && (
                  <div className="w-full h-[500px] border rounded-lg overflow-hidden">
                    <iframe
                      src={`/pdfs/${exercise.pdfUrl.split('/').pop()}`}
                      className="w-full h-full"
                      title="Exercise Materials"
                      sandbox="allow-same-origin allow-scripts allow-forms"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Your Submission</h2>
            {progress?.videoUrl && !showRecorder ? (
              <VideoPlayer 
                url={progress.videoUrl} 
                onRerecord={async () => {
                  // Delete the previous video before allowing rerecord
                  if (progress.videoUrl) {
                    try {
                      await fetch(`/api/delete-video`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoUrl: progress.videoUrl })
                      });
                    } catch (error) {
                      console.warn('Failed to delete previous video:', error);
                      // Don't block rerecording if deletion fails
                    }
                  }
                  setShowRecorder(true);
                }}
              />
            ) : (
              <VideoRecorder 
                onRecordingComplete={(blob, videoUrl) => {
                  if (videoUrl) {
                    // Update progress with the server video URL
                    updateProgressMutation.mutate({ videoUrl, completed: true });
                    setShowRecorder(false);
                  }
                }}
              />
            )}
          </div>
        </div>

        {progress?.completed && showProfessionalAnswer && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Professional Answer</h2>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-600 mb-4">
                Watch this professional answer to compare and learn from their approach:
              </p>
              <VideoPlayer url={exercise.professionalAnswerUrl} />
            </div>
          </div>
        )}

        {progress?.completed && (
          <div className="mt-8">
            <div className="flex items-center text-green-600 mb-4">
              <Check className="mr-2 h-5 w-5" />
              Exercise completed
            </div>

            {/* AI Feedback Section */}
            {aiFeedback && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  🤖 AI Feedback
                  {aiFeedback.aiConfidenceScore && (
                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Confidence: {aiFeedback.aiConfidenceScore}%
                    </span>
                  )}
                </h3>
                
                {aiFeedback.aiAnalysisStatus === "processing" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-blue-800">AI is analyzing your video submission...</span>
                    </div>
                  </div>
                )}

                {aiFeedback.aiAnalysisStatus === "completed" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium text-blue-900">
                        AI Rating: {aiFeedback.rating}/5
                      </div>
                      <div className="text-sm text-blue-600">
                        {new Date(aiFeedback.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-blue-800 whitespace-pre-wrap">
                      {aiFeedback.content}
                    </div>
                  </div>
                )}

                {aiFeedback.aiAnalysisStatus === "failed" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800">
                      ❌ AI analysis failed. Please contact support if this issue persists.
                    </div>
                  </div>
                )}

                {aiFeedback.aiAnalysisStatus === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-yellow-800">
                      ⏳ AI analysis is queued and will begin shortly...
                    </div>
                  </div>
                )}
              </div>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {progress.feedback?.length
                    ? "View & Add Feedback"
                    : "Add Feedback"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Exercise Feedback</DialogTitle>
                </DialogHeader>
                {progress.feedback?.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <h3 className="font-semibold">Previous Feedback</h3>
                    {progress.feedback.map((feedback) => (
                      <div
                        key={feedback.id}
                        className={`p-4 rounded-lg ${
                          feedback.isAiGenerated 
                            ? "bg-blue-50 border border-blue-200" 
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              Rating: {feedback.rating}/5
                            </div>
                            {feedback.isAiGenerated && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                🤖 AI Generated
                              </span>
                            )}
                            {feedback.aiConfidenceScore && (
                              <span className="text-xs text-blue-600">
                                Confidence: {feedback.aiConfidenceScore}%
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <p className={`whitespace-pre-wrap ${
                          feedback.isAiGenerated ? "text-blue-800" : "text-gray-700"
                        }`}>
                          {feedback.content}
                        </p>
                        {feedback.aiAnalysisStatus === "processing" && (
                          <div className="mt-2 text-blue-600 text-sm flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Analyzing video...
                          </div>
                        )}
                        {feedback.aiAnalysisStatus === "failed" && (
                          <div className="mt-2 text-red-600 text-sm">
                            ❌ Analysis failed
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <FeedbackForm progressId={progress.id} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}