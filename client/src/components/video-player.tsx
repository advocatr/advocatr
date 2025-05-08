
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useRef, useState } from "react";

interface SwitchPoint {
  timeInSeconds: number;
  nextVideoUrl: string;
}

interface VideoPlayerProps {
  url: string;
  switchPoints?: SwitchPoint[];
}

export default function VideoPlayer({ url, switchPoints = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState(url);
  const sortedSwitchPoints = [...switchPoints].sort((a, b) => a.timeInSeconds - b.timeInSeconds);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !switchPoints.length) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const switchPoint = sortedSwitchPoints.find(point => 
        point.timeInSeconds <= currentTime && 
        currentTime < point.timeInSeconds + 1
      );

      if (switchPoint) {
        video.pause();
        setCurrentVideo(switchPoint.nextVideoUrl);
        video.currentTime = 0;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [switchPoints]);

  return (
    <AspectRatio ratio={16 / 9}>
      <video
        ref={videoRef}
        src={currentVideo}
        controls
        className="w-full h-full object-cover rounded-lg"
      />
    </AspectRatio>
  );
}
