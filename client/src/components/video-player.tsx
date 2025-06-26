import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Circle } from "lucide-react";
import Webcam from "react-webcam";

interface VideoPlayerProps {
  url?: string | null;
  isRecordingEnabled?: boolean;
  onRecordingComplete?: (blob: Blob, videoUrl?: string) => void;
}

export default function VideoPlayer({
  url,
  isRecordingEnabled = false,
  onRecordingComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  const handleDataAvailable = useCallback(
    ({ data }: { data: Blob }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const startRecording = useCallback(() => {
    try {
      setError(null);
      setRecordedChunks([]);

      if (!webcamRef.current || !webcamRef.current.stream) {
        setError('Camera not initialized. Please refresh the page and try again.');
        return;
      }

      const stream = webcamRef.current.stream;

      // Check MediaRecorder support and find best codec
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=h264,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/mp4';
            }
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorder.addEventListener("stop", async () => {
        console.log('MediaRecorder stopped, chunks:', recordedChunks.length);

        // Use the chunks from state
        if (recordedChunks.length === 0) {
          setError('No video data was recorded. Please try again.');
          return;
        }

        const blob = new Blob(recordedChunks, { type: mimeType });
        console.log('Final blob size:', blob.size, 'bytes');

        // Upload the video to the server
        try {
          const formData = new FormData();
          formData.append('video', blob, 'recording.webm');

          const response = await fetch('/api/upload-video', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const { videoUrl } = await response.json();
            onRecordingComplete?.(blob, videoUrl);
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
          }
        } catch (error) {
          console.error('Error uploading video:', error);
          setError(`Failed to upload video: ${error instanceof Error ? error.message : 'Please try again.'}`);
          onRecordingComplete?.(blob);
        }
      });

      mediaRecorder.start(100); // Request data every 100ms
      setIsRecording(true);
      console.log('MediaRecorder started with format:', mimeType);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(error instanceof Error ? error.message : "Failed to start recording. Please try again.");
    }
  }, [webcamRef, recordedChunks, handleDataAvailable, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [mediaRecorderRef, isRecording]);

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
        {isRecordingEnabled && !url ? (
          <Webcam
            audio={true}
            ref={webcamRef}
            videoConstraints={videoConstraints}
            className="w-full h-64 object-cover"
            onUserMediaError={(error) => {
              console.error('Webcam error:', error);
              setError('Failed to access camera/microphone. Please check permissions and try again.');
            }}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            controls={!!url && !isRecordingEnabled}
            src={url || undefined}
            playsInline
          />
        )}
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