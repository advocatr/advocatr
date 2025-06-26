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
      console.log('Starting recording process...');

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

      console.log('Stream obtained:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Determine the best supported MIME type
      let mimeType = '';
      const possibleTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ];

      for (const type of possibleTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Selected MIME type:', mimeType);
          break;
        }
      }

      if (!mimeType) {
        console.log('No specific MIME type supported, using default');
      }

      // Create MediaRecorder with options
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      console.log('MediaRecorder created with MIME type:', mediaRecorder.mimeType);

      // Array to store chunks - using closure to ensure proper reference
      let recordedChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event - size:', event.data.size, 'type:', event.data.type);
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log('Chunk added. Total chunks:', recordedChunks.length, 'Total size so far:', recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0));
        } else {
          console.warn('Empty or invalid data chunk received');
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully. State:', mediaRecorder.state);
        recordedChunks = []; // Reset chunks array
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
      };

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped. State:', mediaRecorder.state);
        console.log('Final chunks count:', recordedChunks.length);
        console.log('Chunk sizes:', recordedChunks.map(chunk => chunk.size));
        
        if (recordedChunks.length === 0) {
          setError('No video data was recorded. Please try again.');
          return;
        }

        const totalSize = recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('Total recorded data size:', totalSize, 'bytes');

        if (totalSize === 0) {
          setError('Recording produced no data. Please try again.');
          return;
        }

        const blob = new Blob(recordedChunks, { 
          type: mediaRecorder.mimeType || mimeType || 'video/webm' 
        });
        
        console.log('Final blob created - size:', blob.size, 'type:', blob.type);
        setRecordedChunks([blob]);

        // Upload the video to the server
        try {
          const formData = new FormData();
          formData.append('video', blob, 'recording.webm');

          console.log('Uploading video blob of size:', blob.size);

          const response = await fetch('/api/upload-video', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const { videoUrl } = await response.json();
            console.log('Upload successful, video URL:', videoUrl);
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

      // Start recording with timeslice to ensure regular data collection
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(1000); // Request data every second
      setIsRecording(true);
      
      // Verify recording state after a short delay
      setTimeout(() => {
        console.log('MediaRecorder state after start:', mediaRecorder.state);
        if (mediaRecorder.state !== 'recording') {
          console.error('MediaRecorder failed to start recording');
          setError('Failed to start recording. Please try again.');
          setIsRecording(false);
        }
      }, 100);
      
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
      console.log('Stopping recording... Current state:', mediaRecorderRef.current.state);
      
      if (mediaRecorderRef.current.state === 'recording') {
        // Request any pending data before stopping
        mediaRecorderRef.current.requestData();
        
        // Small delay to ensure data is captured
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 100);
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