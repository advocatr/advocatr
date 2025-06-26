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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.");
      }

      // Check for HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error("Camera/microphone access requires HTTPS. Please access this page via HTTPS.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Simplified MediaRecorder setup - let the browser choose the best format
      let mediaRecorder;
      let mimeType = '';
      
      // Try different approaches for maximum compatibility
      try {
        // Try with no options first (most compatible)
        mediaRecorder = new MediaRecorder(stream);
        mimeType = 'video/webm'; // Default assumption
        console.log('MediaRecorder created with default settings');
      } catch (error) {
        console.error('Failed to create MediaRecorder with default settings:', error);
        throw new Error('MediaRecorder not supported by this browser');
      }
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event triggered');
        console.log('Event data details:', {
          hasData: !!event.data,
          size: event.data?.size || 0,
          type: event.data?.type || 'unknown',
          constructor: event.data?.constructor?.name
        });
        
        // Accept any data, even if size is reported as 0 (some browsers report incorrectly)
        if (event.data) {
          chunks.push(event.data);
          console.log('Data chunk added. Total chunks:', chunks.length);
          console.log('Chunk details:', {
            index: chunks.length - 1,
            size: event.data.size,
            type: event.data.type
          });
        } else {
          console.warn('No data in dataavailable event');
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully, state:', mediaRecorder.state);
        console.log('Stream tracks:', stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        })));
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
      };

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, total chunks collected:', chunks.length);
        console.log('Chunks details:', chunks.map((chunk, i) => ({
          index: i,
          size: chunk.size,
          type: chunk.type
        })));
        
        // Give time for any final data events
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (chunks.length === 0) {
          console.error('No chunks collected during recording');
          setError('No video data was recorded. This might be a browser compatibility issue. Please try refreshing the page.');
          return;
        }

        // Create blob with detected MIME type from first chunk or fallback
        const detectedType = chunks[0]?.type || mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: detectedType });
        console.log('Final blob created - size:', blob.size, 'bytes', 'type:', blob.type);
        console.log('Using detected type:', detectedType);
        
        // Some browsers might report size as 0 even with valid data, so also check chunks
        if (blob.size === 0 && chunks.every(chunk => chunk.size === 0)) {
          console.error('All chunks are empty');
          setError('Recording failed to capture video data. This might be a browser issue. Try refreshing and recording again.');
          return;
        }
        
        setRecordedChunks([blob]);

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

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Clear the video source
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      // Start recording with a 1-second timeslice to ensure data collection
      console.log('Starting MediaRecorder');
      console.log('MediaRecorder state before start:', mediaRecorder.state);
      console.log('Stream active tracks:', stream.getVideoTracks().length, 'video,', stream.getAudioTracks().length, 'audio');
      
      mediaRecorder.start(1000); // 1-second intervals
      setIsRecording(true);
      
      // Set up interval to request data every few seconds
      const dataRequestInterval = setInterval(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          console.log('Requesting data via interval');
          mediaRecorder.requestData();
        } else {
          clearInterval(dataRequestInterval);
        }
      }, 2000);
      
      // Store interval reference for cleanup
      (mediaRecorder as any).dataRequestInterval = dataRequestInterval;
    } catch (error) {
      console.error("Error starting recording:", error);

      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotFoundError':
            setError("No camera or microphone found. Please connect a camera/microphone and try again.");
            break;
          case 'NotAllowedError':
            setError("Camera/microphone access denied. Please allow permissions and refresh the page.");
            break;
          case 'NotReadableError':
            setError("Camera/microphone is being used by another application. Please close other applications and try again.");
            break;
          case 'OverconstrainedError':
            setError("Camera/microphone doesn't meet the requirements. Please try with a different device.");
            break;
          case 'SecurityError':
            setError("Access blocked due to security restrictions. Please use HTTPS or check your browser settings.");
            break;
          default:
            setError(`Camera/microphone error: ${error.message}`);
        }
      } else {
        setError(error instanceof Error ? error.message : "Failed to access camera/microphone. Please check permissions and try again.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping MediaRecorder, current state:', mediaRecorderRef.current.state);
      
      // Clear any intervals
      if ((mediaRecorderRef.current as any).dataRequestInterval) {
        clearInterval((mediaRecorderRef.current as any).dataRequestInterval);
      }
      
      // Request final data and stop
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('Requesting final data before stop');
        mediaRecorderRef.current.requestData();
        
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Stopping MediaRecorder');
            mediaRecorderRef.current.stop();
          }
        }, 500);
      }
      
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