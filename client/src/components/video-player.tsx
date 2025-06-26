import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Circle } from "lucide-react";

interface VideoPlayerProps {
  url?: string | null;
  isRecordingEnabled?: boolean;
  onRecordingComplete?: (blob: Blob) => void;
}

export default function VideoPlayer({
  url,
  isRecordingEnabled = false,
  onRecordingComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedChunks([blob]);
        onRecordingComplete?.(blob);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Clear the video source
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to access camera/microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!url && !isRecordingEnabled) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No video available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          controls={!!url && !isRecordingEnabled}
          autoPlay={isRecording}
          muted={isRecording}
          src={url || undefined}
          playsInline
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {isRecordingEnabled && (
        <div className="flex gap-2">
          {!isRecording ? (
            <Button onClick={startRecording} className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-red-500" fill="currentColor" />
              Start Recording
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          )}
        </div>
      )}

      {url && !isRecordingEnabled && (
        <div className="flex gap-2">
          <Button onClick={togglePlayback} className="flex items-center gap-2">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      )}
    </div>
  );
}