import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  category: string;
}

interface UseTaskNotificationsOptions {
  tasks: Task[];
  enabled?: boolean;
  reminderMinutes?: number;
}

// Notification sound as a base64-encoded short beep
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1aVl1idnuCh4uNjYyLiYeFgoGAf399fHt6eXh3dnZ1dHRzc3JycXFxcHBwb29vb29vb29vb29vcHBwcXFxcnJyc3N0dHV1dnd3eHl5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/';

export function useTaskNotifications({ tasks, enabled = true, reminderMinutes = 5 }: UseTaskNotificationsOptions) {
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(enabled);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setPermissionGranted(granted);
      return granted;
    }

    return false;
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  // Show notification
  const showNotification = useCallback((task: Task, minutesLeft: number) => {
    const title = minutesLeft <= 0 
      ? `⏰ Task Due Now: ${task.title}`
      : `⚠️ Task Due in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`;
    
    const body = `${task.category} - ${task.priority.toUpperCase()} priority`;
    const icon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🔵';

    // Play sound
    playSound();

    // Show browser notification if permitted
    if (permissionGranted && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: task.id,
          requireInteraction: true,
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }

    // Always show toast notification
    toast.warning(title, {
      description: body,
      duration: 10000,
      action: {
        label: 'View',
        onClick: () => {
          // Could scroll to task or open details
        },
      },
    });
  }, [permissionGranted, playSound]);

  // Check for upcoming tasks
  const checkUpcomingTasks = useCallback(() => {
    if (!notificationsEnabled) return;

    const now = new Date();
    
    tasks.forEach(task => {
      if (task.completed || !task.due_date) return;
      if (notifiedTasksRef.current.has(task.id)) return;

      const dueDate = new Date(task.due_date);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // Notify if within reminder window (5 minutes by default) and not past
      if (diffMinutes <= reminderMinutes && diffMinutes >= -1) {
        notifiedTasksRef.current.add(task.id);
        showNotification(task, Math.max(0, diffMinutes));
      }
    });
  }, [tasks, notificationsEnabled, reminderMinutes, showNotification]);

  // Set up interval to check for upcoming tasks
  useEffect(() => {
    if (!notificationsEnabled) return;

    // Check immediately
    checkUpcomingTasks();

    // Check every 30 seconds
    intervalRef.current = setInterval(checkUpcomingTasks, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkUpcomingTasks, notificationsEnabled]);

  // Clear notified tasks when task list changes significantly
  useEffect(() => {
    const currentIds = new Set(tasks.map(t => t.id));
    notifiedTasksRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        notifiedTasksRef.current.delete(id);
      }
    });
  }, [tasks]);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
  }, []);

  return {
    permissionGranted,
    notificationsEnabled,
    requestPermission,
    toggleNotifications,
    playSound,
  };
}
