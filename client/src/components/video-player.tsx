
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
  const recordedChunksRef = useRef<Blob[]>([]);

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
      cleanup();
    };
  }, [isRecordingEnabled]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      console.log("Initializing camera...");

      // Clean up any existing streams
      cleanup();

      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder is not supported in this browser");
      }

      // Get user media with basic constraints
      console.log("Requesting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Got media stream with tracks:", stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label
      })));

      // Validate stream
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error("No video track found");
      }
      if (audioTracks.length === 0) {
        throw new Error("No audio track found");
      }

      // Check track states
      const inactiveTracks = stream.getTracks().filter(t => t.readyState !== 'live');
      if (inactiveTracks.length > 0) {
        throw new Error(`Some tracks are not active: ${inactiveTracks.map(t => t.kind).join(', ')}`);
      }

      streamRef.current = stream;

      // Setup preview video
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.muted = true;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const video = previewVideoRef.current!;
          const onLoadedData = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            resolve(void 0);
          };
          const onError = (e: any) => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            reject(new Error('Video preview failed to load'));
          };
          video.addEventListener('loadeddata', onLoadedData);
          video.addEventListener('error', onError);
        });

        await previewVideoRef.current.play();
      }

      setIsInitialized(true);
      console.log("Camera initialized successfully");

    } catch (error) {
      console.error("Camera initialization failed:", error);
      cleanup();
      
      let errorMessage = "Camera initialization failed: ";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage += "Camera permission denied. Please allow camera access and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage += "No camera or microphone found on this device.";
        } else if (error.name === "NotSupportedError") {
          errorMessage += "Camera access not supported. Please use HTTPS or a supported browser.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      setError(errorMessage);
      setIsInitialized(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      console.log("Starting recording...");

      if (!streamRef.current) {
        throw new Error("No media stream available");
      }

      // Validate stream is still active
      const activeTracks = streamRef.current.getTracks().filter(t => t.readyState === 'live');
      if (activeTracks.length === 0) {
        throw new Error("No active media tracks");
      }

      console.log("Active tracks:", activeTracks.map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })));

      // Clear previous recordings
      recordedChunksRef.current = [];

      // Test MediaRecorder support with different codecs
      const supportedTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];

      let selectedType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          console.log('Selected MIME type:', type);
          break;
        }
      }

      if (!selectedType) {
        throw new Error('No supported recording format found');
      }

      // Create MediaRecorder with validated stream
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedType,
        videoBitsPerSecond: 500000, // 500kbps
        audioBitsPerSecond: 64000,  // 64kbps
      });

      // Setup event handlers before starting
      let hasReceivedData = false;

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event:', {
          dataSize: event.data.size,
          dataType: event.data.type,
          timestamp: event.timeStamp
        });
        
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          hasReceivedData = true;
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        console.log('Total chunks collected:', recordedChunksRef.current.length);
        console.log('Chunk sizes:', recordedChunksRef.current.map(chunk => chunk.size));

        if (!hasReceivedData || recordedChunksRef.current.length === 0) {
          setError("No data was recorded. This might be a browser compatibility issue.");
          return;
        }

        const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('Total recorded size:', totalSize, 'bytes');

        if (totalSize === 0) {
          setError("Recording produced empty file. Please try again.");
          return;
        }

        const finalBlob = new Blob(recordedChunksRef.current, { type: selectedType });
        console.log('Final blob created:', {
          size: finalBlob.size,
          type: finalBlob.type
        });

        uploadVideo(finalBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed due to MediaRecorder error');
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
      };

      recorderRef.current = mediaRecorder;

      // Start recording
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

    } catch (error) {
      console.error("Failed to start recording:", error);
      setError(error instanceof Error ? error.message : "Failed to start recording");
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      setIsRecording(false);
      recorderRef.current.stop();
    } else {
      console.log("MediaRecorder not in recording state:", recorderRef.current?.state);
      setError("Recording was not active");
    }
  };

  const uploadVideo = async (blob: Blob) => {
    try {
      console.log("Uploading video blob:", {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error("Cannot upload empty file");
      }

      const formData = new FormData();
      formData.append("video", blob, "recording.webm");

      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      const { videoUrl } = await response.json();
      console.log("Upload successful:", videoUrl);
      onRecordingComplete?.(blob, videoUrl);

    } catch (error) {
      console.error("Upload failed:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Still call the callback with the blob so the user has the data
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
