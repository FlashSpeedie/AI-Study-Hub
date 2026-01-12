import { useState } from 'react';
import { 
  Calendar, 
  Download, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  category: string;
  duration?: number;
  notes?: string;
}

interface CalendarExportProps {
  tasks: Task[];
}

export default function CalendarExport({ tasks }: CalendarExportProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Study Hub//Task Manager//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const tasksWithDates = tasks.filter(t => t.due_date && !t.completed);

    tasksWithDates.forEach(task => {
      if (!task.due_date) return;
      
      const date = parseISO(task.due_date);
      const durationMinutes = task.duration || 30;
      const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
      
      const formatICSDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      };

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${task.id}@aistudyhub`);
      lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
      lines.push(`DTSTART:${formatICSDate(date)}`);
      lines.push(`DTEND:${formatICSDate(endDate)}`);
      lines.push(`SUMMARY:${task.title.replace(/,/g, '\\,')}`);
      lines.push(`DESCRIPTION:Category: ${task.category}\\nPriority: ${task.priority}${task.notes ? '\\n\\n' + task.notes.replace(/\n/g, '\\n') : ''}`);
      lines.push(`CATEGORIES:${task.category}`);
      
      if (task.priority === 'high') {
        lines.push('PRIORITY:1');
      } else if (task.priority === 'medium') {
        lines.push('PRIORITY:5');
      } else {
        lines.push('PRIORITY:9');
      }
      
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const downloadICS = () => {
    const icsContent = generateICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-study-hub-tasks-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('ICS file downloaded! Import it into your calendar app.');
  };

  const openGoogleCalendar = (task: Task) => {
    if (!task.due_date) return;
    
    const date = parseISO(task.due_date);
    const durationMinutes = task.duration || 30;
    const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
    
    const formatGoogleDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: task.title,
      dates: `${formatGoogleDate(date)}/${formatGoogleDate(endDate)}`,
      details: `Category: ${task.category}\nPriority: ${task.priority}${task.notes ? '\n\n' + task.notes : ''}`,
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
  };

  const openOutlookCalendar = (task: Task) => {
    if (!task.due_date) return;
    
    const date = parseISO(task.due_date);
    const durationMinutes = task.duration || 30;
    const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: task.title,
      startdt: date.toISOString(),
      enddt: endDate.toISOString(),
      body: `Category: ${task.category}\nPriority: ${task.priority}${task.notes ? '\n\n' + task.notes : ''}`,
    });

    window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params}`, '_blank');
  };

  const copyICS = async () => {
    const icsContent = generateICS();
    await navigator.clipboard.writeText(icsContent);
    setCopied(true);
    toast.success('ICS content copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTasks = tasks.filter(t => t.due_date && !t.completed);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Export Calendar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={downloadICS}>
            <Download className="w-4 h-4 mr-2" />
            Download ICS File
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={copyICS}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy ICS Content
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Quick Add Task
          </DropdownMenuLabel>
          
          {activeTasks.slice(0, 3).map(task => (
            <DropdownMenuItem key={task.id} className="flex-col items-start">
              <span className="font-medium truncate w-full">{task.title}</span>
              <div className="flex gap-2 mt-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleCalendar(task);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Google
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openOutlookCalendar(task);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Outlook
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          
          {activeTasks.length > 3 && (
            <DropdownMenuItem onClick={() => setShowInstructions(true)}>
              <span className="text-muted-foreground text-xs">
                +{activeTasks.length - 3} more tasks...
              </span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowInstructions(true)}>
            How to import?
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import to Your Calendar</DialogTitle>
            <DialogDescription>
              Follow these steps to sync your tasks with your calendar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Google Calendar</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download the ICS file</li>
                <li>Go to calendar.google.com</li>
                <li>Click the gear icon → Settings</li>
                <li>Select "Import & Export"</li>
                <li>Upload the ICS file</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Microsoft Outlook</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download the ICS file</li>
                <li>Double-click the file to open in Outlook</li>
                <li>Click "Import" when prompted</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Apple Calendar</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download the ICS file</li>
                <li>Double-click the file</li>
                <li>Select which calendar to add events to</li>
              </ol>
            </div>

            <Button onClick={downloadICS} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Download ICS File Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
