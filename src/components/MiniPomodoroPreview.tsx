import { Timer, Play, Pause } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export function MiniPomodoroPreview() {
  const {
    pomodoroMode,
    pomodoroTimeLeft,
    pomodoroIsRunning,
    pomodoroSessions,
    setPomodoroIsRunning,
    resetPomodoroTimer,
  } = useStore();

  // Only show if timer is running or has been modified from initial state
  const isVisible = pomodoroIsRunning || pomodoroTimeLeft < 25 * 60 || pomodoroSessions > 0;
  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setPomodoroIsRunning(!pomodoroIsRunning);

  return (
    <Card className="fixed top-4 left-4 z-40 p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-primary" />
        <div className="text-sm">
          <div className="font-medium">{formatTime(pomodoroTimeLeft)}</div>
          <div className="text-xs text-muted-foreground capitalize">
            {pomodoroMode.replace(/([A-Z])/g, ' $1')} • {pomodoroSessions} sessions
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleTimer}
          className="h-6 w-6 p-0"
        >
          {pomodoroIsRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
      </div>
    </Card>
  );
}