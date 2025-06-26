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

      // Check MediaRecorder support and find best codec that supports both video and audio
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
        mimeType: mimeType,
        videoBitsPerSecond: 250000,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event triggered, data size:', event.data?.size, 'bytes');
        console.log('Event data type:', event.data?.type);
        console.log('Event data object:', event.data);
        
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log('Data chunk added to chunks array. Chunk size:', event.data.size, 'bytes', 'Total chunks:', chunks.length);
        } else {
          console.warn('Data available event fired but no usable data:', {
            hasData: !!event.data,
            size: event.data?.size,
            type: event.data?.type
          });
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

        const blob = new Blob(chunks, { type: mimeType });
        console.log('Final blob created - size:', blob.size, 'bytes', 'type:', blob.type);
        
        if (blob.size === 0) {
          console.error('Blob size is 0 despite having chunks');
          setError('Recording failed to capture video data. Please try again.');
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

      // Start recording - try different approaches for better compatibility
      console.log('Starting MediaRecorder with format:', mimeType);
      console.log('MediaRecorder state before start:', mediaRecorder.state);
      
      // Try starting without timeslice first, then with timeslice if needed
      try {
        mediaRecorder.start(); // Start without timeslice
        console.log('MediaRecorder started without timeslice');
      } catch (error) {
        console.warn('Failed to start without timeslice, trying with timeslice:', error);
        try {
          mediaRecorder.start(1000); // Fall back to 1-second timeslice
          console.log('MediaRecorder started with 1-second timeslice');
        } catch (fallbackError) {
          console.error('Failed to start MediaRecorder with any method:', fallbackError);
          throw new Error('MediaRecorder failed to start');
        }
      }
      
      setIsRecording(true);
      
      // Verify recording started and force data collection
      setTimeout(() => {
        if (mediaRecorder.state !== 'recording') {
          console.error('MediaRecorder failed to start, state:', mediaRecorder.state);
          setError('Failed to start recording. Please try again.');
          setIsRecording(false);
        } else {
          console.log('MediaRecorder confirmed recording, state:', mediaRecorder.state);
          // Force request data to ensure we get at least one chunk
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              console.log('Requesting data from MediaRecorder');
              mediaRecorder.requestData();
            }
          }, 1000);
        }
      }, 500);
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
      
      // Request any pending data before stopping
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('Requesting final data before stop');
        mediaRecorderRef.current.requestData();
        
        // Wait a bit longer and request data again, then stop
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Requesting data again and stopping');
            mediaRecorderRef.current.requestData();
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }, 200);
          }
        }, 300);
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