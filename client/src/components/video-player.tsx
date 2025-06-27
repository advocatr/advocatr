import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Circle } from "lucide-react";

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isRecordingEnabled && !streamRef.current) {
      initializeCamera();
    }

    return () => {
      cleanup();
    };
  }, [isRecordingEnabled]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      cleanup();

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not available");
      }

      // Check current permissions
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        console.log("Permission states:", {
          camera: cameraPermission.state,
          microphone: microphonePermission.state,
          userAgent: navigator.userAgent,
          isSecureContext: window.isSecureContext,
          protocol: window.location.protocol
        });
      } catch (permError) {
        console.log("Permission query failed (this is normal in some browsers):", permError);
      }

      console.log("Requesting media stream...");
      
      // Get basic media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true,
      });

      console.log("Stream obtained:", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active
      });

      // Verify tracks are active
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length === 0) {
        throw new Error("No video track available");
      }
      
      if (audioTracks.length === 0) {
        throw new Error("No audio track available");
      }

      streamRef.current = stream;

      // Setup preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.muted = true;
        
        try {
          await previewVideoRef.current.play();
          console.log("Preview video started successfully");
        } catch (playError) {
          console.error("Preview play failed:", playError);
          throw new Error("Failed to start video preview");
        }
      }

      setIsInitialized(true);
      console.log("Camera initialized successfully");

    } catch (error) {
      console.error("Camera initialization failed:", error);
      cleanup();
      
      let errorMessage = "Failed to access camera. ";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += "Permission denied. Please allow camera and microphone access in your browser settings.";
        } else if (error.name === 'NotFoundError') {
          errorMessage += "No camera or microphone found.";
        } else if (error.name === 'NotReadableError') {
          errorMessage += "Camera is already in use by another application.";
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += "Camera constraints could not be satisfied.";
        } else {
          errorMessage += error.message;
        }
      }
      
      setError(errorMessage);
      setIsInitialized(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      if (!streamRef.current) {
        throw new Error("No media stream available");
      }

      // Clear previous chunks
      chunksRef.current = [];

      // Create MediaRecorder with minimal config
      const recorder = new MediaRecorder(streamRef.current);

      // Setup event handlers
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Data chunk received:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunksRef.current.length);

        if (chunksRef.current.length === 0) {
          setError("No data was recorded");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('Final blob size:', blob.size);

        if (blob.size === 0) {
          setError("Recording produced empty file");
          return;
        }

        uploadVideo(blob);
      };

      recorder.onerror = (event) => {
        console.error('Recording error:', event);
        setError('Recording failed');
      };

      recorderRef.current = recorder;

      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started');

    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (blob: Blob) => {
    try {
      console.log("Uploading video:", blob.size, "bytes");

      const formData = new FormData();
      formData.append("video", blob, "recording.webm");

      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const { videoUrl } = await response.json();
      console.log("Upload successful:", videoUrl);
      onRecordingComplete?.(blob, videoUrl);

    } catch (error) {
      console.error("Upload failed:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
            style={{ transform: "scaleX(-1)" }}
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
          <button 
            onClick={() => {
              setError(null);
              if (isRecordingEnabled) {
                initializeCamera();
              }
            }}
            className="text-red-600 underline text-sm mt-1"
          >
            Try again
          </button>
        </div>
      )}

      {isRecordingEnabled && (
        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex items-center gap-2"
              disabled={!isInitialized}
            >
              <Circle className="h-4 w-4 text-red-500" fill="currentColor" />
              {isInitialized ? "Start Recording" : "Initializing..."}
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