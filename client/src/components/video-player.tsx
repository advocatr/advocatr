
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface VideoPlayerProps {
  url?: string | null;
  onRerecord?: () => void;
}

export default function VideoPlayer({ url, onRerecord }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  if (!url) {
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
          controls
          src={url}
          playsInline
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onPlay={handlePlay}
          onPause={handlePause}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <p className="text-white">Loading video...</p>
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
            <p className="text-white text-center px-4">
              Error loading video. Please try refreshing the page.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={togglePlayback} 
          className="flex items-center gap-2"
          disabled={hasError || isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        
        {onRerecord && (
          <Button 
            onClick={onRerecord}
            variant="outline"
            className="flex items-center gap-2"
            disabled={hasError || isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            Rerecord
          </Button>
        )}
      </div>
    </div>
  );
}
