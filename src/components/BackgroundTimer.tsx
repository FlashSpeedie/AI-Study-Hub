import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

const TIMER_PRESETS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export function BackgroundTimer() {
  const {
    pomodoroMode,
    pomodoroTimeLeft,
    pomodoroIsRunning,
    setPomodoroTimeLeft,
    setPomodoroIsRunning,
    incrementPomodoroSessions,
    setPomodoroMode,
  } = useStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pomodoroIsRunning && pomodoroTimeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setPomodoroTimeLeft(pomodoroTimeLeft - 1);
      }, 1000);
    } else if (pomodoroTimeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pomodoroIsRunning, pomodoroTimeLeft, setPomodoroTimeLeft]);

  const handleTimerComplete = () => {
    setPomodoroIsRunning(false);
    if (pomodoroMode === 'focus') {
      incrementPomodoroSessions();
      toast.success('Focus session complete! Take a break.');
      setPomodoroMode('shortBreak');
    } else {
      toast.success('Break over! Ready to focus?');
      setPomodoroMode('focus');
    }
  };

  // This component doesn't render anything, it just manages the timer in the background
  return null;
}