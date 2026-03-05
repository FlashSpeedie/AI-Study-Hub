import { useState, useRef, useEffect, MouseEvent } from 'react';
import { Timer, Play, Pause, X, Move, Maximize2, Minimize2 } from 'lucide-react';
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

  const isVisible = pomodoroIsRunning || pomodoroTimeLeft < 25 * 60 || pomodoroSessions > 0;
  if (!isVisible) return null;

  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setPomodoroIsRunning(!pomodoroIsRunning);

  const handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, e.clientX - dragOffset.x),
          y: Math.max(0, e.clientY - dragOffset.y),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as unknown as EventListener);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as unknown as EventListener);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const closeTimer = () => {
    resetPomodoroTimer();
  };

  return (
    <Card
      ref={cardRef}
      className={`fixed z-50 bg-background/95 backdrop-blur-sm border shadow-lg transition-all duration-200 cursor-default ${isExpanded ? 'w-72' : 'w-auto'}`}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle flex items-center justify-between p-2 border-b bg-muted/30 cursor-grab hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Move className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {pomodoroMode.replace(/([A-Z])/g, ' $1')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-5 w-5 p-0"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={closeTimer}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-3">
          <Timer className={`w-5 h-5 ${pomodoroIsRunning ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
          <div className={isExpanded ? 'text-center w-full' : ''}>
            <div className={`font-mono font-bold ${isExpanded ? 'text-2xl' : 'text-lg'}`}>
              {formatTime(pomodoroTimeLeft)}
            </div>
            {!isExpanded && (
              <div className="text-xs text-muted-foreground">
                {pomodoroSessions} sessions
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleTimer}
            className="h-8 w-8 p-0"
          >
            {pomodoroIsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-medium capitalize">{pomodoroMode.replace(/([A-Z])/g, ' $1')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sessions:</span>
              <span className="font-medium">{pomodoroSessions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${pomodoroIsRunning ? 'text-red-500' : 'text-green-500'}`}>
                {pomodoroIsRunning ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
