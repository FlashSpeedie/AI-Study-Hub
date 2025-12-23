import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_PRESETS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export default function Pomodoro() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      setSessions((prev) => prev + 1);
      toast.success('Focus session complete! Take a break.');
      setMode('shortBreak');
      setTimeLeft(TIMER_PRESETS.shortBreak);
    } else {
      toast.success('Break over! Ready to focus?');
      setMode('focus');
      setTimeLeft(TIMER_PRESETS.focus);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_PRESETS[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_PRESETS[newMode]);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_PRESETS[mode] - timeLeft) / TIMER_PRESETS[mode]) * 100;

  return (
    <div className="max-w-lg mx-auto animate-in">
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Timer className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Pomodoro Timer</h1>
        </div>
        <p className="text-muted-foreground">Stay focused with timed study sessions</p>
      </div>

      <Card className="p-8">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'focus', label: 'Focus', icon: Brain },
            { key: 'shortBreak', label: 'Short Break', icon: Coffee },
            { key: 'longBreak', label: 'Long Break', icon: Coffee },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={mode === key ? 'default' : 'outline'}
              onClick={() => switchMode(key as TimerMode)}
              className="flex-1 gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="128" cy="128" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <motion.circle
              cx="128" cy="128" r="120" fill="none"
              stroke={mode === 'focus' ? 'hsl(var(--primary))' : 'hsl(var(--emerald))'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              initial={false}
              animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-display font-bold">{formatTime(timeLeft)}</span>
            <span className="text-muted-foreground capitalize">{mode.replace(/([A-Z])/g, ' $1')}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button size="lg" variant="outline" onClick={resetTimer}>
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button size="lg" onClick={toggleTimer} className="px-8 gap-2">
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
        </div>

        {/* Sessions */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Sessions completed today</p>
          <p className="text-2xl font-bold">{sessions}</p>
        </div>
      </Card>
    </div>
  );
}
