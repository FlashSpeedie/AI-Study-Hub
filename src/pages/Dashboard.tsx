import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  BookOpen, 
  CheckCircle,
  Target,
  FileText,
  Timer,
  ClipboardList,
  Plus,
  Sparkles,
  ChevronRight,
  Clock,
  TrendingUp,
  Flame
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { 
  calculateSubjectGrade, 
  getLetterGrade, 
  getGradeColor
} from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Pro Tips that rotate
const PRO_TIPS = [
  "Use the Pomodoro Timer for focused 25-minute study sessions",
  "Generate flashcards on any topic with AI in seconds",
  "The AI Detector can check your essays before submitting",
  "Record your lectures and get AI-generated summaries",
  "Use the Quiz Generator to test yourself before exams"
];

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean | null;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  teacher?: string | null;
  categories: any[];
}

interface Assignment {
  id: string;
  name: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  name: string;
  type: 'assignment' | 'note' | 'task';
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { academicYears, selectedYearId, selectedSemesterId, tasks: storeTasks } = useStore();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (tasksData) {
        setTasks(tasksData);
      }

      // Fetch subjects from current semester
      const year = academicYears.find(y => y.id === selectedYearId);
      const semester = year?.semesters.find(s => s.id === selectedSemesterId);
      if (semester) {
        setSubjects(semester.subjects);
      }

      // Fetch notes count
      const { count: notesCountData } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (notesCountData !== null) {
        setNotesCount(notesCountData);
      }

      // Fetch recent assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (assignmentsData) {
        setAssignments(assignmentsData);
      }

      // Build recent activity from assignments and notes
      const activity: ActivityItem[] = [];
      
      // Add assignments
      assignmentsData?.forEach(a => {
        activity.push({
          id: a.id,
          name: a.name,
          type: 'assignment',
          created_at: a.created_at
        });
      });

      // Fetch recent notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      
      notesData?.forEach(n => {
        activity.push({
          id: n.id,
          name: n.title || 'Untitled Note',
          type: 'note',
          created_at: n.created_at
        });
      });

      // Add completed tasks
      const completedTasks = tasksData?.filter(t => t.completed).slice(0, 3) || [];
      completedTasks.forEach(t => {
        activity.push({
          id: t.id,
          name: t.title,
          type: 'task',
          created_at: t.created_at
        });
      });

      // Sort by date and take first 6
      activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activity.slice(0, 6));

      setLoading(false);
    };

    fetchData();
  }, [academicYears, selectedYearId, selectedSemesterId, storeTasks]);

  // Rotate tips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.username || 'Student';
  
  // Format today's date
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate stats
  const stats = useMemo(() => {
    const subjectsData = subjects || [];
    const totalSubjects = subjectsData.length;
    
    // Calculate average percentage
    let totalGrade = 0;
    let gradedSubjects = 0;
    
    subjectsData.forEach(subject => {
      const grade = calculateSubjectGrade(subject);
      if (subject.categories.some(c => c.assignments.length > 0)) {
        totalGrade += grade;
        gradedSubjects++;
      }
    });

    const avgPercentage = gradedSubjects > 0 ? totalGrade / gradedSubjects : 0;
    const avgLetter = getLetterGrade(avgPercentage);

    // Tasks due today
    const today = new Date().toISOString().split('T')[0];
    const tasksDueToday = tasks?.filter(t => {
      if (!t.due_date) return false;
      return t.due_date.split('T')[0] === today;
    }).length || 0;

    // Tasks due this week
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const tasksDueThisWeek = tasks?.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= new Date() && dueDate <= weekFromNow;
    }).length || 0;

    // Study streak (consecutive days with activity)
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasActivity = assignments.some(a => 
        a.created_at.split('T')[0] === dateStr
      );
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const moreDueThisWeek = tasksDueThisWeek - tasksDueToday;
    const completedTasksCount = tasks?.filter(t => t.completed).length || 0;

    return {
      totalSubjects,
      avgPercentage: avgPercentage.toFixed(1),
      avgLetter,
      tasksDueToday,
      moreDueThisWeek,
      streak,
      completedTasks: completedTasksCount,
    };
  }, [subjects, tasks, assignments]);

  const getGradeLetterStyle = (grade: number) => {
    if (grade >= 90) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (grade >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (grade >= 60) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return { icon: BookOpen, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
      case 'note':
        return { icon: FileText, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
      case 'task':
        return { icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
      default:
        return { icon: Clock, bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <div className="animate-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}, {name}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{todayDate}</p>
        </div>
        
        {/* Action buttons - hidden on mobile */}
        <div className="hidden sm:flex gap-3">
          <Button onClick={() => navigate('/grades')} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Grade
          </Button>
          <Button variant="outline" onClick={() => navigate('/quiz')} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Quiz
          </Button>
        </div>
      </div>

      {/* Stats row - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1 - Average Grade */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average Grade</span>
            {stats.avgPercentage !== '0.0' && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getGradeLetterStyle(parseFloat(stats.avgPercentage))}`}>
                {stats.avgLetter}
              </span>
            )}
          </div>
          <div className="text-4xl font-black">
            {loading ? <Skeleton className="h-10 w-20" /> : stats.avgPercentage}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            across {stats.totalSubjects} subjects
          </p>
        </Card>

        {/* Card 2 - Tasks Due Today */}
        <Card 
          className="p-5 hover:border-primary/50 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/tasks')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Today</span>
          </div>
          <div className="text-4xl font-black">
            {loading ? <Skeleton className="h-10 w-16" /> : stats.tasksDueToday}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.moreDueThisWeek > 0 ? `${stats.moreDueThisWeek} more due this week` : 'All caught up!'}
          </p>
        </Card>

        {/* Card 3 - Active Subjects */}
        <Card 
          className="p-5 hover:border-primary/50 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/grades')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Subjects</span>
          </div>
          <div className="text-4xl font-black">
            {loading ? <Skeleton className="h-10 w-16" /> : stats.totalSubjects}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {subjects.slice(0, 3).map((subject, i) => (
              <span 
                key={i} 
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {subject.name}
              </span>
            ))}
            {subjects.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                +{subjects.length - 3} more
              </span>
            )}
          </div>
        </Card>

        {/* Card 4 - Study Streak */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Study Streak</span>
          </div>
          <div className="text-3xl font-black">
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <>🔥 {stats.streak} days</>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.streak > 0 ? 'Keep it up!' : 'Start your streak today!'}
          </p>
        </Card>
      </div>

      {/* Quick Actions row */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card 
            className="p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-center h-24"
            onClick={() => navigate('/grades')}
          >
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add Grade</span>
          </Card>
          
          <Card 
            className="p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-center h-24"
            onClick={() => navigate('/notes')}
          >
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">New Note</span>
          </Card>
          
          <Card 
            className="p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-center h-24"
            onClick={() => navigate('/pomodoro')}
          >
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <Timer className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Pomodoro</span>
          </Card>
          
          <Card 
            className="p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-center h-24"
            onClick={() => navigate('/quiz')}
          >
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Quiz</span>
          </Card>
        </div>
      </div>

      {/* Referral nudge banner */}
      <div className="rounded-xl border bg-gradient-to-r from-purple-50 
        to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 
        border-purple-200 dark:border-purple-800 p-4 
        flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Win ChatGPT Plus this month!
            </p>
            <p className="text-xs text-muted-foreground">
              Refer friends to APEX — most referrals by month end wins.
              Share your link in Account → Referrals.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 border-purple-300 text-purple-700
            hover:bg-purple-50 dark:text-purple-300"
          onClick={() => navigate('/account')}
        >
          Share Link
        </Button>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Your Subjects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Subjects</h3>
            <button 
              onClick={() => navigate('/grades')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-16 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </Card>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-semibold mb-2">No subjects yet</h4>
              <p className="text-muted-foreground mb-4">
                Head to Grades to add your first subject
              </p>
              <Button onClick={() => navigate('/grades')}>
                Go to Grades
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const grade = calculateSubjectGrade(subject);
                const letter = getLetterGrade(grade);
                const hasGrades = subject.categories.some(c => c.assignments.length > 0);
                
                return (
                  <Card 
                    key={subject.id} 
                    className="p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate('/grades')}
                  >
                    <div className="flex gap-3">
                      {/* Left accent bar */}
                      <div 
                        className="w-1 rounded-full" 
                        style={{ backgroundColor: subject.color }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{subject.name}</h4>
                        {subject.teacher && (
                          <p className="text-xs text-muted-foreground">{subject.teacher}</p>
                        )}
                        
                        {hasGrades ? (
                          <>
                            <div className="flex items-center gap-2 mt-2">
                              <span 
                                className="text-2xl font-bold"
                                style={{ color: subject.color }}
                              >
                                {grade.toFixed(1)}%
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getGradeLetterStyle(grade)}`}>
                                {letter}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${grade}%`,
                                  backgroundColor: subject.color
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No grades yet</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column - Recent Activity */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          
          {loading ? (
            <Card className="p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </Card>
          ) : recentActivity.length === 0 ? (
            <Card className="p-6 text-center">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground">Start studying to see activity here</p>
            </Card>
          ) : (
            <Card className="p-2">
              {recentActivity.map((activity, index) => {
                const { icon: ActivityIcon, bg, text } = getActivityIcon(activity.type);
                
                return (
                  <div 
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-start gap-3 py-2.5 px-2 border-b last:border-0"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <ActivityIcon className={`w-4 h-4 ${text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* Rotating Pro Tips */}
          <Card className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1">💡 Pro Tip</p>
                <p className="text-sm">{PRO_TIPS[currentTipIndex]}</p>
              </div>
            </div>
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {PRO_TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTipIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentTipIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
