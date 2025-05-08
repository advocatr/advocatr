
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  candidateUrl?: string;
  demoUrl: string;
  switchTimes: number[]; // Array of times in seconds when to switch
  onComplete?: () => void;
}

export default function VideoPlayer({ candidateUrl, demoUrl, switchTimes, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [currentSwitchIndex, setCurrentSwitchIndex] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !candidateUrl || switchTimes.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      if (currentSwitchIndex < switchTimes.length && currentTime >= switchTimes[currentSwitchIndex]) {
        video.pause();
        setIsPlayingDemo(!isPlayingDemo);
        setCurrentSwitchIndex(currentSwitchIndex + 1);
        video.currentTime = 0;
      }

      // Check if we've reached the end of all switches
      if (currentSwitchIndex >= switchTimes.length && currentTime >= video.duration) {
        onComplete?.();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [candidateUrl, switchTimes, currentSwitchIndex, isPlayingDemo]);

  return (
    <AspectRatio ratio={16 / 9}>
      <video
        ref={videoRef}
        src={isPlayingDemo ? demoUrl : candidateUrl}
        controls
        className="w-full h-full object-cover rounded-lg"
      />
    </AspectRatio>
  );
}
