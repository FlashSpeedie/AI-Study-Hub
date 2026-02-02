import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download } from 'lucide-react'; // Added Download
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner'; // Added toast import

interface Recording {
  id: string;
  name: string;
  audio_url: string | null;
  duration: number;
}

interface RecordingPlayerProps {
  recording: Recording;
}

export default function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element if we have a URL
    if (recording.audio_url) {
      audioRef.current = new Audio(recording.audio_url);
      audioRef.current.volume = volume;
      
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [recording.audio_url]);

  const togglePlay = () => {
    if (!audioRef.current) {
      // Demo mode - simulate playback
      setIsPlaying(!isPlaying);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume : 0;
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const restart = () => {
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleDownloadAudio = () => {
    if (recording.audio_url) {
      const link = document.createElement('a');
      link.href = recording.audio_url;
      link.download = `${recording.name}.webm`; // Or appropriate extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloading audio...');
    } else {
      toast.error('No audio URL available for download.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate time progression when no audio URL
  useEffect(() => {
    if (isPlaying && !recording.audio_url) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= recording.duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + playbackRate;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, recording.audio_url, recording.duration, playbackRate]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{recording.name}</h2>
          <p className="text-muted-foreground">
            Duration: {formatTime(recording.duration)}
          </p>
        </div>

        {/* Waveform Visualization (simplified) */}
        <div className="h-24 bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          <div className="flex items-center gap-0.5 h-full px-4">
            {Array.from({ length: 60 }).map((_, i) => {
              const progress = currentTime / (recording.duration || 1);
              const isActive = i / 60 <= progress;
              return (
                <motion.div
                  key={i}
                  className={`w-1 rounded-full ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  style={{
                    height: `${20 + Math.sin(i * 0.3) * 30 + Math.random() * 20}%`
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Progress Slider */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={recording.duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(recording.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={restart}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={changePlaybackRate}
            className="min-w-[60px]"
          >
            {playbackRate}x
          </Button>
        </div>

        {/* Volume Control and Download */}
        <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
          {recording.audio_url && (
            <Button variant="ghost" size="icon" onClick={handleDownloadAudio}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>

        {!recording.audio_url && (
          <p className="text-center text-sm text-muted-foreground">
            Audio playback simulation (recording not saved to storage)
          </p>
        )}
      </div>
    </Card>
  );
}
