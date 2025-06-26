import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Circle } from "lucide-react";
import RecordRTC from "recordrtc";

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
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize camera when recording is enabled
  useEffect(() => {
    if (isRecordingEnabled && !streamRef.current) {
      initializeCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recorderRef.current) {
        recorderRef.current.destroy();
      }
    };
  }, [isRecordingEnabled]);

  const initializeCamera = async () => {
    try {
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera/microphone access is not supported in this browser or environment.");
      }

      // Check permissions first
      try {
        const permissions = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName })
        ]);

        console.log("Permission states:", {
          camera: permissions[0].state,
          microphone: permissions[1].state
        });
      } catch (permError) {
        console.log("Permission check not available, proceeding with getUserMedia");
      }

      console.log("Requesting camera/microphone access...");

      let stream: MediaStream;
      
      try {
        // Try with detailed constraints first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      } catch (detailedError) {
        console.log("Detailed constraints failed, trying basic constraints:", detailedError);
        
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      streamRef.current = stream;

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.muted = true; // Prevent feedback
        await previewVideoRef.current.play();
      }

      setIsInitialized(true);
      console.log(
        "Camera initialized successfully with tracks:",
        stream
          .getTracks()
          .map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          })),
      );
    } catch (error) {
      console.error("Error accessing camera:", error);

      let errorMessage = "Camera access failed. ";

      if (error instanceof Error) {
        console.log("Error details:", { name: error.name, message: error.message });

        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage += "Please ensure camera/microphone permissions are granted in your browser settings.";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage += "No camera or microphone detected on this device.";
        } else if (error.name === "NotSupportedError") {
          errorMessage += "This browser doesn't support camera access or requires HTTPS.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage += "Camera settings not supported. Try refreshing the page.";
        } else {
          errorMessage += "Please refresh the page and try again.";
        }
      } else {
        errorMessage += "Unknown error occurred. Please refresh and try again.";
      }

      setError(errorMessage);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      if (!streamRef.current) {
        await initializeCamera();
        if (!streamRef.current) {
          setError("Camera not available. Please refresh and try again.");
          return;
        }
      }

      // Validate stream has active tracks
      const activeTracks = streamRef.current.getTracks().filter(t => t.readyState === 'live');
      if (activeTracks.length === 0) {
        setError("No active media tracks available. Please refresh and try again.");
        return;
      }

      console.log("Active tracks for recording:", activeTracks.map(t => ({ 
        kind: t.kind, 
        enabled: t.enabled, 
        readyState: t.readyState 
      })));

      // Create RecordRTC instance with optimized settings
      const recorder = new RecordRTC(streamRef.current, {
        type: "video",
        mimeType: "video/webm;codecs=vp8,opus",
        recorderType: RecordRTC.MediaStreamRecorder,
        disableLogs: false,
        videoBitsPerSecond: 256000,
        audioBitsPerSecond: 64000,
        timeSlice: 1000, // Generate data every second
        checkForInactiveTracks: true,
        bufferSize: 16384,
      });

      recorderRef.current = recorder;

      console.log("Starting RecordRTC recording...");
      recorder.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start recording. Please try again.",
      );
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      console.log("Stopping RecordRTC recording...");
      setIsRecording(false);

      recorderRef.current.stopRecording(async () => {
        // Wait longer for the recording to finalize
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const blob = recorderRef.current?.getBlob();

        console.log("Recording stopped. Blob details:", {
          size: blob?.size || 0,
          type: blob?.type || "unknown",
          lastModified: blob instanceof File ? blob.lastModified : "N/A",
        });

        // Validate the recording
        if (!blob) {
          setError("Recording failed - no blob created. Please try again.");
          return;
        }

        if (blob.size === 0) {
          setError("Recording failed - empty file. This might be a browser compatibility issue. Try refreshing and recording again.");
          return;
        }

        if (blob.size < 1000) { // Less than 1KB is suspicious
          console.warn("Very small recording detected:", blob.size, "bytes");
        }

        // Upload the video
        uploadVideo(blob);
      });
    }
  };

  const uploadVideo = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("video", blob, "recording.webm");

      console.log("Uploading video file. Size:", blob.size, "bytes");

      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { videoUrl } = await response.json();
        console.log("Video uploaded successfully:", videoUrl);
        onRecordingComplete?.(blob, videoUrl);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed with status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      setError(
        `Failed to upload video: ${error instanceof Error ? error.message : "Please try again."}`,
      );
      onRecordingComplete?.(blob);
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
          <video
            ref={previewVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 object-cover"
            style={{ transform: "scaleX(-1)" }} // Mirror the video for better UX
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
            <Button
              onClick={startRecording}
              className="flex items-center gap-2"
              disabled={!isInitialized && isRecordingEnabled}
            >
              <Circle className="h-4 w-4 text-red-500" fill="currentColor" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          )}
        </div>
      )}

      {url && !isRecordingEnabled && (
        <div className="flex gap-2">
          <Button onClick={togglePlayback} className="flex items-center gap-2">
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      )}
    </div>
  );
}