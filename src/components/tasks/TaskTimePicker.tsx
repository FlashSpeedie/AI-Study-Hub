import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TaskTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export default function TaskTimePicker({ value, onChange, className }: TaskTimePickerProps) {
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [open, setOpen] = useState(false);

  // Parse the value into components
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      let hourNum = parseInt(h, 10);
      const minNum = parseInt(m, 10);
      
      if (hourNum >= 12) {
        setPeriod('PM');
        if (hourNum > 12) hourNum -= 12;
      } else {
        setPeriod('AM');
        if (hourNum === 0) hourNum = 12;
      }
      
      setHour(hourNum.toString().padStart(2, '0'));
      setMinute(minNum.toString().padStart(2, '0'));
    }
  }, [value]);

  const handleConfirm = () => {
    let hourNum = parseInt(hour, 10);
    if (period === 'PM' && hourNum !== 12) hourNum += 12;
    if (period === 'AM' && hourNum === 12) hourNum = 0;
    
    const timeString = `${hourNum.toString().padStart(2, '0')}:${minute}`;
    onChange(timeString);
    setOpen(false);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const displayTime = value ? (() => {
    const [h, m] = value.split(':');
    let hourNum = parseInt(h, 10);
    const p = hourNum >= 12 ? 'PM' : 'AM';
    if (hourNum > 12) hourNum -= 12;
    if (hourNum === 0) hourNum = 12;
    return `${hourNum}:${m} ${p}`;
  })() : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime || "Set time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium text-center">Select Time</div>
          
          <div className="flex items-center justify-center gap-2">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Hour</div>
              <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto p-1">
                {hours.map(h => (
                  <button
                    key={h}
                    onClick={() => setHour(h)}
                    className={cn(
                      "w-8 h-8 rounded-md text-sm transition-colors",
                      hour === h 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-2xl font-bold">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Minute</div>
              <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto p-1">
                {minutes.map(m => (
                  <button
                    key={m}
                    onClick={() => setMinute(m)}
                    className={cn(
                      "w-8 h-8 rounded-md text-sm transition-colors",
                      minute === m 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setPeriod('AM')}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  period === 'AM' 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                AM
              </button>
              <button
                onClick={() => setPeriod('PM')}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  period === 'PM' 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Quick Select</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: '9 AM', h: '09', m: '00', p: 'AM' },
                { label: '12 PM', h: '12', m: '00', p: 'PM' },
                { label: '3 PM', h: '03', m: '00', p: 'PM' },
                { label: '5 PM', h: '05', m: '00', p: 'PM' },
                { label: '8 PM', h: '08', m: '00', p: 'PM' },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setHour(preset.h);
                    setMinute(preset.m);
                    setPeriod(preset.p as 'AM' | 'PM');
                  }}
                  className="px-2 py-1 text-xs rounded border hover:bg-muted transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>
              Clear
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              Set Time
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
