import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DurationPickerProps {
  value: number;
  onChange: (duration: number) => void;
  className?: string;
}

const durations = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

export default function DurationPicker({ value, onChange, className }: DurationPickerProps) {
  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger className={cn("gap-2", className)}>
        <Clock className="w-4 h-4 text-muted-foreground" />
        <SelectValue placeholder="Duration" />
      </SelectTrigger>
      <SelectContent>
        {durations.map((d) => (
          <SelectItem key={d.value} value={d.value.toString()}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
