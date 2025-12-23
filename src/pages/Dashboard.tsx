import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { 
  calculateSubjectGrade, 
  calculateSemesterGPA,
  calculateOverallGPA,
  getLetterGrade, 
  getGradeColor,
  percentageToGPA
} from '@/types';

export default function Dashboard() {
  const { user, academicYears, selectedYearId, selectedSemesterId, tasks } = useStore();

  const currentData = useMemo(() => {
    const year = academicYears.find(y => y.id === selectedYearId);
    const semester = year?.semesters.find(s => s.id === selectedSemesterId);
    return { year, semester };
  }, [academicYears, selectedYearId, selectedSemesterId]);

  const stats = useMemo(() => {
    const subjects = currentData.semester?.subjects || [];
    const totalSubjects = subjects.length;
    
    // Calculate semester GPA
    const semesterGPA = currentData.semester ? calculateSemesterGPA(currentData.semester) : 0;
    
    // Calculate overall GPA across all years
    const overallGPA = calculateOverallGPA(academicYears);
    
    // Calculate average percentage
    let totalGrade = 0;
    let gradedSubjects = 0;
    
    subjects.forEach(subject => {
      const grade = calculateSubjectGrade(subject);
      if (subject.categories.some(c => c.assignments.length > 0)) {
        totalGrade += grade;
        gradedSubjects++;
      }
    });

    const avgPercentage = gradedSubjects > 0 ? totalGrade / gradedSubjects : 0;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;

    return {
      totalSubjects,
      avgPercentage: avgPercentage.toFixed(1),
      avgLetter: getLetterGrade(avgPercentage),
      semesterGPA: semesterGPA.toFixed(2),
      overallGPA: overallGPA.toFixed(2),
      completedTasks,
      pendingTasks,
    };
  }, [currentData.semester, tasks, academicYears]);

  const recentSubjects = useMemo(() => {
    const subjects = currentData.semester?.subjects || [];
    return subjects.slice(0, 6).map(subject => ({
      ...subject,
      grade: calculateSubjectGrade(subject),
      gpa: percentageToGPA(calculateSubjectGrade(subject)),
      hasGrades: subject.categories.some(c => c.assignments.length > 0),
    }));
  }, [currentData.semester]);

  const statCards = [
    {
      title: 'Semester GPA',
      value: stats.semesterGPA,
      subtitle: `${stats.avgPercentage}% average`,
      icon: Award,
      color: 'bg-emerald/10 text-emerald',
    },
    {
      title: 'Cumulative GPA',
      value: stats.overallGPA,
      subtitle: 'All semesters',
      icon: TrendingUp,
      color: 'bg-sky/10 text-sky',
    },
    {
      title: 'Active Subjects',
      value: stats.totalSubjects.toString(),
      subtitle: currentData.semester?.name || 'No semester selected',
      icon: BookOpen,
      color: 'bg-amber/10 text-amber',
    },
    {
      title: 'Tasks Completed',
      value: stats.completedTasks.toString(),
      subtitle: `${stats.pendingTasks} pending`,
      icon: CheckCircle,
      color: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <motion.h1 
          className="text-3xl font-display font-bold mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Welcome back, {user?.username || 'Student'}!
        </motion.h1>
        <p className="text-muted-foreground">
          Here's an overview of your academic progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5 h-full hover:shadow-soft transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Subjects Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Your Subjects</h2>
          <span className="text-sm text-muted-foreground">
            {currentData.semester?.name || 'Select a semester in Grades'}
          </span>
        </div>

        {recentSubjects.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subjects yet</h3>
            <p className="text-muted-foreground">
              Head to the Grades tab to add your academic year, semester, and subjects.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSubjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <Card className="p-5 hover:shadow-soft transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: subject.color + '20' }}
                    >
                      <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {subject.categories.length} categories
                      </p>
                    </div>
                  </div>
                  
                  {subject.hasGrades ? (
                    <div className="text-center">
                      <p 
                        className="text-3xl font-bold"
                        style={{ color: subject.color }}
                      >
                        {subject.grade.toFixed(1)}%
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className={`grade-badge ${getGradeColor(subject.grade)}`}>
                          {getLetterGrade(subject.grade)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          GPA: {subject.gpa.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-muted-foreground text-sm">No grades yet</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald/5 border-primary/10">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Pro Tip: Use the Pomodoro Timer</h3>
              <p className="text-sm text-muted-foreground">
                Break your study sessions into focused 25-minute intervals with short breaks. 
                Studies show this technique improves concentration and retention.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
