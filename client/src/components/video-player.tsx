
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'inactive' | 'recording' | 'paused'>('inactive');

  useEffect(() => {
    if (isRecordingEnabled && !streamRef.current) {
      initializeMediaStream();
    }

    return () => {
      cleanup();
    };
  }, [isRecordingEnabled]);

  const cleanup = () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clean up MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
  };

  const initializeMediaStream = async () => {
    try {
      setError(null);
      cleanup();

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported by this browser");
      }

      // Request media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 44100 }
        }
      });

      // Verify stream has required tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error("No video track available");
      }

      if (audioTracks.length === 0) {
        throw new Error("No audio track available");
      }

      streamRef.current = stream;

      // Setup preview video
      if (previewVideoRef.current) {
        const videoElement = previewVideoRef.current;
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;

        try {
          await videoElement.play();
        } catch (playError) {
          console.warn("Preview video autoplay failed:", playError);
        }
      }

      setIsInitialized(true);
      console.log("Media stream initialized successfully");

    } catch (error) {
      console.error("Failed to initialize media stream:", error);
      cleanup();
      
      let errorMessage = "Failed to access camera and microphone. ";
      
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage += "Permission denied. Please allow camera and microphone access.";
            break;
          case 'NotFoundError':
            errorMessage += "No camera or microphone found.";
            break;
          case 'NotReadableError':
            errorMessage += "Camera is already in use by another application.";
            break;
          case 'OverconstrainedError':
            errorMessage += "Camera constraints could not be satisfied.";
            break;
          case 'SecurityError':
            errorMessage += "Access denied due to security restrictions.";
            break;
          default:
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

      if (!MediaRecorder.isTypeSupported) {
        throw new Error("MediaRecorder is not supported");
      }

      // Determine the best supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported video MIME type found");
      }

      // Clear previous recording data
      recordedChunksRef.current = [];

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log(`Recorded chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstart = () => {
        console.log("Recording started");
        setRecordingStatus('recording');
        setIsRecording(true);
      };

      mediaRecorder.onstop = () => {
        console.log("Recording stopped");
        setRecordingStatus('inactive');
        setIsRecording(false);
        handleRecordingComplete();
      };

      mediaRecorder.onpause = () => {
        console.log("Recording paused");
        setRecordingStatus('paused');
      };

      mediaRecorder.onresume = () => {
        console.log("Recording resumed");
        setRecordingStatus('recording');
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed due to an error");
        setRecordingStatus('inactive');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start recording with time slice for progressive data collection
      mediaRecorder.start(1000); // Collect data every 1000ms

    } catch (error) {
      console.error("Failed to start recording:", error);
      setError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRecordingStatus('inactive');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordingComplete = async () => {
    try {
      if (recordedChunksRef.current.length === 0) {
        throw new Error("No recording data available");
      }

      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, {
        type: recordedChunksRef.current[0].type || 'video/webm'
      });

      console.log(`Recording complete: ${blob.size} bytes`);

      if (blob.size === 0) {
        throw new Error("Recording produced empty file");
      }

      // Upload the recording
      await uploadRecording(blob);

    } catch (error) {
      console.error("Failed to process recording:", error);
      setError(`Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      console.log("Uploading recording:", blob.size, "bytes");

      const formData = new FormData();
      formData.append("video", blob, "recording.webm");

      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const { videoUrl } = await response.json();
      console.log("Upload successful:", videoUrl);
      
      // Notify parent component
      onRecordingComplete?.(blob, videoUrl);

    } catch (error) {
      console.error("Upload failed:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      
      // Still notify parent with blob even if upload failed
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
            controls={false}
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
        
        {/* Recording status indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Circle className="h-3 w-3 animate-pulse" fill="currentColor" />
            <span className="text-sm font-medium">Recording</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              if (isRecordingEnabled) {
                initializeMediaStream();
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
