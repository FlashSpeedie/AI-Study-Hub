import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Pause, Play, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
  isRecording: boolean;
  onStop: (audioBlob: Blob, duration: number) => void;
  recordingName: string;
}

export default function RecordingControls({ isRecording, onStop, recordingName }: RecordingControlsProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'requesting' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Start recording when component mounts and isRecording is true
  useEffect(() => {
    if (isRecording && recordingState === 'idle') {
      startRecording();
    }
    
    return () => {
      cleanup();
    };
  }, [isRecording]);

  const startRecording = async () => {
    setError(null);
    setRecordingState('requesting');
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start visualization
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
      
      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
          
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const finalDuration = pausedDurationRef.current + (Date.now() - startTimeRef.current) / 1000;
        onStop(audioBlob, finalDuration);
        cleanup();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      
      // Start timer
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      
      timerRef.current = setInterval(() => {
        const elapsed = pausedDurationRef.current + (Date.now() - startTimeRef.current) / 1000;
        setDuration(Math.floor(elapsed));
      }, 100);
      
      setRecordingState('recording');
      toast.success('Recording started - speak now!');
      
    } catch (err: unknown) {
      console.error('Error starting recording:', err);
      
      const errorObj = err as { name?: string };
      
      if (errorObj.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and refresh the page.');
      } else if (errorObj.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to start recording. Please check your microphone and try again.');
      }
      
      setRecordingState('idle');
      toast.error('Failed to access microphone');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      pausedDurationRef.current += (Date.now() - startTimeRef.current) / 1000;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setRecordingState('paused');
      toast.info('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const elapsed = pausedDurationRef.current + (Date.now() - startTimeRef.current) / 1000;
        setDuration(Math.floor(elapsed));
      }, 100);
      
      setRecordingState('recording');
      toast.success('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      setRecordingState('stopped');
      mediaRecorderRef.current.stop();
      toast.info('Processing recording...');
    }
  };

  const retryRecording = () => {
    setError(null);
    setDuration(0);
    startRecording();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate bars for visualization
  const bars = Array.from({ length: 40 }, (_, i) => {
    const baseHeight = 4;
    const maxHeight = 64;
    const variance = Math.sin(i * 0.5 + Date.now() * 0.005) * 0.3 + 0.7;
    const height = baseHeight + (audioLevel * maxHeight * variance);
    return Math.min(height, maxHeight);
  });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">{recordingName}</h3>
          <p className="text-sm text-muted-foreground">
            {recordingState === 'idle' && 'Click the button to start recording'}
            {recordingState === 'requesting' && 'Requesting microphone access...'}
            {recordingState === 'recording' && 'Recording in progress - speak clearly'}
            {recordingState === 'paused' && 'Recording paused'}
            {recordingState === 'stopped' && 'Saving recording...'}
          </p>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer */}
        <div className="text-center">
          <div className="text-5xl font-mono font-bold tabular-nums">
            {formatTime(duration)}
          </div>
        </div>

        {/* Audio Visualization */}
        <div className="flex items-center justify-center gap-0.5 h-16 bg-muted/30 rounded-lg overflow-hidden px-4">
          {recordingState === 'requesting' ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            bars.map((height, i) => (
              <motion.div
                key={i}
                className={cn(
                  "w-1.5 rounded-full transition-colors",
                  recordingState === 'recording' ? "bg-red-500" : 
                  recordingState === 'paused' ? "bg-amber-500" : "bg-muted-foreground/30"
                )}
                animate={{ 
                  height: recordingState === 'recording' ? height : 4,
                }}
                transition={{ 
                  duration: 0.05,
                  ease: "easeOut"
                }}
              />
            ))
          )}
        </div>

        {/* Recording Indicator */}
        <AnimatePresence>
          {recordingState === 'recording' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm text-muted-foreground">Recording...</span>
            </motion.div>
          )}
          {recordingState === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Paused</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {recordingState === 'idle' && (
            <Button
              size="lg"
              onClick={error ? retryRecording : startRecording}
              className="gap-2 bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="w-5 h-5" />
              {error ? 'Retry Recording' : 'Start Recording'}
            </Button>
          )}

          {recordingState === 'requesting' && (
            <Button size="lg" disabled className="gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Requesting Permission...
            </Button>
          )}

          {recordingState === 'recording' && (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={pauseRecording}
                className="gap-2"
              >
                <Pause className="w-5 h-5" />
                Pause
              </Button>
              <Button
                size="lg"
                onClick={stopRecording}
                className="gap-2 bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <Button
                size="lg"
                onClick={resumeRecording}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Play className="w-5 h-5" />
                Resume
              </Button>
              <Button
                size="lg"
                onClick={stopRecording}
                className="gap-2 bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            </>
          )}

          {recordingState === 'stopped' && (
            <Button size="lg" disabled className="gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving & Transcribing...
            </Button>
          )}
        </div>

        {/* Tips */}
        {(recordingState === 'idle' || recordingState === 'recording' || recordingState === 'paused') && (
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>🎤 Speak clearly and stay close to your microphone for best results.</p>
            <p>💡 Recording will be automatically transcribed after you stop.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
