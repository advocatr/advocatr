import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Circle, Square } from "lucide-react";

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, videoUrl?: string) => void;
  maxDurationSeconds?: number; // Maximum recording duration in seconds
}

export default function VideoRecorder({
  onRecordingComplete,
  maxDurationSeconds = 300, // Default 5 minutes
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "inactive" | "recording" | "paused"
  >("inactive");
  const [recordingTime, setRecordingTime] = useState(0);
  const [timeLimitReached, setTimeLimitReached] = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    initializeMediaStream();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset timer state
    setRecordingTime(0);
    setTimeLimitReached(false);
  };

  const initializeMediaStream = async () => {
    try {
      setError(null);
      cleanup();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported by this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 44100 },
        },
      });

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error("No video track available");
      }

      if (audioTracks.length === 0) {
        throw new Error("No audio track available");
      }

      streamRef.current = stream;

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
          case "NotAllowedError":
            errorMessage +=
              "Permission denied. Please allow camera and microphone access.";
            break;
          case "NotFoundError":
            errorMessage += "No camera or microphone found.";
            break;
          case "NotReadableError":
            errorMessage += "Camera is already in use by another application.";
            break;
          case "OverconstrainedError":
            errorMessage += "Camera constraints could not be satisfied.";
            break;
          case "SecurityError":
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

      // Check for MediaRecorder support
      console.log(
        "MediaRecorder is",
        typeof MediaRecorder !== "undefined" ? "available" : "NOT available",
      );
      if (!MediaRecorder || !MediaRecorder.isTypeSupported) {
        throw new Error("MediaRecorder not supported by this browser");
      }

      // Clear previous recording data
      recordedChunksRef.current = [];

      // Determine supported MIME type
      let mimeType = "";
      if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm";
      }
      const options = mimeType ? { mimeType } : {};
      console.log("Using MediaRecorder options:", options);

      // Log before creating MediaRecorder
      console.log("About to create MediaRecorder", streamRef.current, options);
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, options);
      } catch (err) {
        console.error("Failed to create MediaRecorder:", err);
        setError(
          "Failed to create MediaRecorder: " +
            (err instanceof Error ? err.message : String(err)),
        );
        return;
      }
      console.log("MediaRecorder created", mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        console.log(
          "[ondataavailable] Data available event:",
          event.data.size,
          "bytes",
          event.data.type,
          event,
        );
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log(
            `[ondataavailable] Recorded chunk: ${event.data.size} bytes, type: ${event.data.type}, total chunks: ${recordedChunksRef.current.length}`,
          );
        } else {
          console.warn("[ondataavailable] Received empty data chunk");
        }
      };

      mediaRecorder.onstart = () => {
        console.log("[onstart] Recording started");
        setRecordingStatus("recording");
        setIsRecording(true);
        setRecordingTime(0);
        setTimeLimitReached(false);
        
        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prevTime) => {
            const newTime = prevTime + 1;
            
            // Check if time limit reached
            if (newTime >= maxDurationSeconds) {
              setTimeLimitReached(true);
              // Auto-stop recording when time limit is reached
              setTimeout(() => {
                stopRecording();
              }, 100);
            }
            
            return newTime;
          });
        }, 1000);
      };

      mediaRecorder.onstop = () => {
        console.log(
          "[onstop] Recording stopped, chunks:",
          recordedChunksRef.current.length,
        );
        setRecordingStatus("inactive");
        setIsRecording(false);
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (
          mediaRecorder.state === "inactive" &&
          recordedChunksRef.current.length === 0
        ) {
          console.warn("[onstop] No data collected during recording");
        }
        setTimeout(() => {
          handleRecordingComplete();
        }, 200);
      };

      mediaRecorder.onerror = (event) => {
        console.error("[onerror] MediaRecorder error:", event);
        setError("Recording failed due to an error");
        setRecordingStatus("inactive");
        setIsRecording(false);
        
        // Clear timer on error
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      // Log before and after starting MediaRecorder
      console.log("About to start MediaRecorder");
      mediaRecorder.start(1000);
      console.log("MediaRecorder started");
    } catch (error) {
      console.error("[startRecording] Failed to start recording:", error);
      setError(
        `Failed to start recording: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setRecordingStatus("inactive");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      console.log("Stopping recording...");
      // Request final data before stopping
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordingComplete = async () => {
    try {
      console.log(
        "Processing recording, chunks available:",
        recordedChunksRef.current.length,
      );

      if (recordedChunksRef.current.length === 0) {
        throw new Error("No recording data available");
      }

      // Log chunk details
      let totalSize = 0;
      recordedChunksRef.current.forEach((chunk, index) => {
        console.log(`Chunk ${index}: ${chunk.size} bytes, type: ${chunk.type}`);
        totalSize += chunk.size;
      });

      console.log(`Total data size: ${totalSize} bytes`);

      // Use the actual type from the first chunk if available
      const firstChunkType = recordedChunksRef.current[0]?.type;
      const blobType = firstChunkType || "video/webm";
      const blob = new Blob(recordedChunksRef.current, { type: blobType });

      console.log(`Recording complete: ${blob.size} bytes, type: ${blob.type}`);

      if (blob.size === 0) {
        throw new Error("Recording produced empty file");
      }

      // Create a temporary URL for the blob
      const videoUrl = URL.createObjectURL(blob);
      console.log("Created video URL:", videoUrl);

      // Call the completion handler
      onRecordingComplete(blob, videoUrl);

      // Clean up the temporary URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(videoUrl);
      }, 1000);

      // Reset for next recording
      recordedChunksRef.current = [];
    } catch (error) {
      console.error("Failed to process recording:", error);
      setError(
        `Failed to process recording: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <video
            ref={previewVideoRef}
            autoPlay
            muted
            playsInline
            controls={false}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        </AspectRatio>

        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Circle className="h-3 w-3 animate-pulse" fill="currentColor" />
            <span className="text-sm font-medium">Recording</span>
          </div>
        )}
        
        {isRecording && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full">
            <span className="text-sm font-mono">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              {timeLimitReached && (
                <span className="text-red-400 ml-2">(Time limit reached)</span>
              )}
            </span>
          </div>
        )}
        
        {isRecording && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-50 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  recordingTime / maxDurationSeconds > 0.8 
                    ? 'bg-red-500' 
                    : recordingTime / maxDurationSeconds > 0.6 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.min((recordingTime / maxDurationSeconds) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initializeMediaStream();
            }}
            className="text-red-600 underline text-sm mt-1"
          >
            Try again
          </button>
        </div>
      )}

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
    </div>
  );
}
