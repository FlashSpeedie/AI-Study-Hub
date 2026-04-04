import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AcademicYear, 
  Semester, 
  Subject, 
  Category, 
  Assignment, 
  Task, 
  Quiz,
  ChatMessage,
  User,
  generateId 
} from '@/types';
import * as gradesSyncService from '@/services/gradesSyncService';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  darkMode: boolean;
  
  
  academicYears: AcademicYear[];
  selectedYearId: string | null;
  selectedSemesterId: string | null;
  selectedSubjectId: string | null;
  
  
  tasks: Task[];

  
  pomodoroMode: 'focus' | 'shortBreak' | 'longBreak';
  pomodoroTimeLeft: number;
  pomodoroIsRunning: boolean;
  pomodoroSessions: number;

  
  quizzes: Quiz[];
  
  
  chatMessages: ChatMessage[];
  
  // Grades Sync State
  gradesSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  gradesSyncError: string | null;
  lastSyncedAt: string | null;
  setGradesSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => void;
  setGradesSyncError: (error: string | null) => void;
  setLastSyncedAt: (time: string | null) => void;
  
  // Actions - Auth
  login: (user: User) => void;
  logout: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  
  // Actions - Academic Years
  addAcademicYear: (name: string) => void;
  updateAcademicYear: (id: string, name: string) => void;
  deleteAcademicYear: (id: string) => void;
  setSelectedYear: (id: string | null) => void;
  
  // Actions - Semesters
  addSemester: (yearId: string, name: string) => void;
  updateSemester: (yearId: string, semesterId: string, name: string) => void;
  deleteSemester: (yearId: string, semesterId: string) => void;
  setSelectedSemester: (id: string | null) => void;
  
  // Actions - Subjects
  addSubject: (yearId: string, semesterId: string, name: string, color?: string) => void;
  updateSubject: (yearId: string, semesterId: string, subjectId: string, name: string) => void;
  deleteSubject: (yearId: string, semesterId: string, subjectId: string) => void;
  setSelectedSubject: (id: string | null) => void;
  
  // Actions - Categories
  addCategory: (yearId: string, semesterId: string, subjectId: string, name: string, weight: number) => void;
  updateCategory: (yearId: string, semesterId: string, subjectId: string, categoryId: string, name: string, weight: number) => void;
  deleteCategory: (yearId: string, semesterId: string, subjectId: string, categoryId: string) => void;
  
  // Actions - Assignments
  addAssignment: (yearId: string, semesterId: string, subjectId: string, categoryId: string, name: string, earnedPoints: number, totalPoints: number) => void;
  updateAssignment: (yearId: string, semesterId: string, subjectId: string, categoryId: string, assignmentId: string, name: string, earnedPoints: number, totalPoints: number) => void;
  deleteAssignment: (yearId: string, semesterId: string, subjectId: string, categoryId: string, assignmentId: string) => void;
  
  // Actions - Tasks
  addTask: (title: string, priority?: 'low' | 'medium' | 'high', dueDate?: Date) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // Actions - Pomodoro
  setPomodoroMode: (mode: 'focus' | 'shortBreak' | 'longBreak') => void;
  setPomodoroTimeLeft: (timeLeft: number) => void;
  setPomodoroIsRunning: (isRunning: boolean) => void;
  incrementPomodoroSessions: () => void;
  resetPomodoroTimer: () => void;
  
  // Actions - Quizzes
  addQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt'>) => void;
  updateQuiz: (id: string, updates: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
  
  // Actions - Chat
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
}

const subjectColors = [
  'hsl(222, 47%, 20%)', // Navy
  'hsl(160, 84%, 39%)', // Emerald
  'hsl(199, 89%, 48%)', // Sky
  'hsl(0, 72%, 51%)', // Ruby
  'hsl(38, 92%, 50%)', // Amber
  'hsl(280, 65%, 60%)', // Purple
  'hsl(25, 95%, 53%)', // Orange
  'hsl(330, 80%, 50%)', // Pink
];

let colorIndex = 0;
const getNextColor = () => {
  const color = subjectColors[colorIndex % subjectColors.length];
  colorIndex++;
  return color;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      darkMode: false,
      academicYears: [],
      selectedYearId: null,
      selectedSemesterId: null,
      selectedSubjectId: null,
      tasks: [],
      pomodoroMode: 'focus',
      pomodoroTimeLeft: 25 * 60,
      pomodoroIsRunning: false,
      pomodoroSessions: 0,
      quizzes: [],
      chatMessages: [],

      // Grades Sync State
      gradesSyncStatus: 'idle',
      gradesSyncError: null,
      lastSyncedAt: null,
      setGradesSyncStatus: (status) => set({ gradesSyncStatus: status }),
      setGradesSyncError: (error) => set({ gradesSyncError: error }),
      setLastSyncedAt: (time) => set({ lastSyncedAt: time }),

      // Auth Actions
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ darkMode: newDarkMode });
      },
      setDarkMode: (dark: boolean) => {
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ darkMode: dark });
      },

      // Academic Year Actions
      addAcademicYear: (name) => {
        const newYear: AcademicYear = {
          id: generateId(),
          name,
          semesters: [],
        };
        // 1. Update local state immediately (optimistic)
        set((state) => ({
          academicYears: [...state.academicYears, newYear],
          selectedYearId: state.selectedYearId || newYear.id,
        }));
        
        // 2. Sync to Supabase async (non-blocking)
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.saveAcademicYear(userId, newYear).then(({ error }) => {
            if (error) {
              console.error('Failed to sync academic year to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            } else {
              get().setGradesSyncStatus('synced');
              get().setLastSyncedAt(new Date().toLocaleTimeString());
            }
          });
        }
      },
      updateAcademicYear: (id, name) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === id ? { ...y, name } : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        const year = get().academicYears.find(y => y.id === id);
        if (userId && year) {
          gradesSyncService.saveAcademicYear(userId, { ...year, name }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync academic year update to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            }
          });
        }
      },
      deleteAcademicYear: (id) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.filter((y) => y.id !== id),
          selectedYearId: state.selectedYearId === id ? null : state.selectedYearId,
        }));
        
        // 2. Delete from Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.deleteAcademicYear(userId, id).then(({ error }) => {
            if (error) console.error('Failed to delete academic year from cloud:', error);
          });
        }
      },
      setSelectedYear: (id) => set({ selectedYearId: id, selectedSemesterId: null, selectedSubjectId: null }),

      // Semester Actions
      addSemester: (yearId, name) => {
        const newSemester: Semester = {
          id: generateId(),
          name,
          subjects: [],
        };
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? { ...y, semesters: [...y.semesters, newSemester] }
              : y
          ),
          selectedSemesterId: state.selectedSemesterId || newSemester.id,
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.saveSemester(userId, { ...newSemester, academic_year_id: yearId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync semester to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            }
          });
        }
      },
      updateSemester: (yearId, semesterId, name) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId ? { ...s, name } : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        const year = get().academicYears.find(y => y.id === yearId);
        const semester = year?.semesters.find(s => s.id === semesterId);
        if (userId && semester) {
          gradesSyncService.saveSemester(userId, { ...semester, name, academic_year_id: yearId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync semester update to cloud:', error);
              get().setGradesSyncStatus('error');
            }
          });
        }
      },
      deleteSemester: (yearId, semesterId) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? { ...y, semesters: y.semesters.filter((s) => s.id !== semesterId) }
              : y
          ),
          selectedSemesterId: state.selectedSemesterId === semesterId ? null : state.selectedSemesterId,
        }));
        
        // 2. Delete from Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.deleteSemester(userId, semesterId).then(({ error }) => {
            if (error) console.error('Failed to delete semester from cloud:', error);
          });
        }
      },
      setSelectedSemester: (id) => set({ selectedSemesterId: id, selectedSubjectId: null }),

      // Subject Actions
      addSubject: (yearId, semesterId, name, color) => {
        const newSubject: Subject = {
          id: generateId(),
          name,
          color: color || getNextColor(),
          categories: [],
        };
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? { ...s, subjects: [...s.subjects, newSubject] }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.saveSubject(userId, { ...newSubject, semester_id: semesterId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync subject to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            }
          });
        }
      },
      updateSubject: (yearId, semesterId, subjectId, name) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId ? { ...sub, name } : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        const year = get().academicYears.find(y => y.id === yearId);
        const semester = year?.semesters.find(s => s.id === semesterId);
        const subject = semester?.subjects.find(s => s.id === subjectId);
        if (userId && subject) {
          gradesSyncService.saveSubject(userId, { ...subject, name, semester_id: semesterId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync subject update to cloud:', error);
              get().setGradesSyncStatus('error');
            }
          });
        }
      },
      deleteSubject: (yearId, semesterId, subjectId) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? { ...s, subjects: s.subjects.filter((sub) => sub.id !== subjectId) }
                      : s
                  ),
                }
              : y
          ),
          selectedSubjectId: state.selectedSubjectId === subjectId ? null : state.selectedSubjectId,
        }));
        
        // 2. Delete from Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.deleteSubject(userId, subjectId).then(({ error }) => {
            if (error) console.error('Failed to delete subject from cloud:', error);
          });
        }
      },
      setSelectedSubject: (id) => set({ selectedSubjectId: id }),

      // Category Actions
      addCategory: (yearId, semesterId, subjectId, name, weight) => {
        const newCategory: Category = {
          id: generateId(),
          name,
          weight,
          assignments: [],
        };
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? { ...sub, categories: [...sub.categories, newCategory] }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.saveCategory(userId, { ...newCategory, subject_id: subjectId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync category to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            }
          });
        }
      },
      updateCategory: (yearId, semesterId, subjectId, categoryId, name, weight) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? {
                                  ...sub,
                                  categories: sub.categories.map((c) =>
                                    c.id === categoryId ? { ...c, name, weight } : c
                                  ),
                                }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        const year = get().academicYears.find(y => y.id === yearId);
        const semester = year?.semesters.find(s => s.id === semesterId);
        const subject = semester?.subjects.find(s => s.id === subjectId);
        const category = subject?.categories.find(c => c.id === categoryId);
        if (userId && category) {
          gradesSyncService.saveCategory(userId, { ...category, name, weight, subject_id: subjectId }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync category update to cloud:', error);
              get().setGradesSyncStatus('error');
            }
          });
        }
      },
      deleteCategory: (yearId, semesterId, subjectId, categoryId) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? { ...sub, categories: sub.categories.filter((c) => c.id !== categoryId) }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Delete from Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.deleteCategory(userId, categoryId).then(({ error }) => {
            if (error) console.error('Failed to delete category from cloud:', error);
          });
        }
      },

      // Assignment Actions
      addAssignment: (yearId, semesterId, subjectId, categoryId, name, earnedPoints, totalPoints) => {
        const newAssignment: Assignment = {
          id: generateId(),
          name,
          earnedPoints,
          totalPoints,
          percentage: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0,
          createdAt: new Date(),
        };
        // 1. Update local state immediately (optimistic)
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? {
                                  ...sub,
                                  categories: sub.categories.map((c) =>
                                    c.id === categoryId
                                      ? { ...c, assignments: [...c.assignments, newAssignment] }
                                      : c
                                  ),
                                }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase async (non-blocking)
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.saveAssignment(userId, {
            ...newAssignment,
            category_id: categoryId,
          }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync assignment to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            } else {
              get().setGradesSyncStatus('synced');
              get().setLastSyncedAt(new Date().toLocaleTimeString());
            }
          });
        }
      },
      updateAssignment: (yearId, semesterId, subjectId, categoryId, assignmentId, name, earnedPoints, totalPoints) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? {
                                  ...sub,
                                  categories: sub.categories.map((c) =>
                                    c.id === categoryId
                                      ? {
                                          ...c,
                                          assignments: c.assignments.map((a) =>
                                            a.id === assignmentId
                                              ? {
                                                  ...a,
                                                  name,
                                                  earnedPoints,
                                                  totalPoints,
                                                  percentage: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0,
                                                }
                                              : a
                                          ),
                                        }
                                      : c
                                  ),
                                }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Sync to Supabase
        const userId = get().user?.id;
        const year = get().academicYears.find(y => y.id === yearId);
        const semester = year?.semesters.find(s => s.id === semesterId);
        const subject = semester?.subjects.find(s => s.id === subjectId);
        const category = subject?.categories.find(c => c.id === categoryId);
        const assignment = category?.assignments.find(a => a.id === assignmentId);
        if (userId && assignment) {
          gradesSyncService.saveAssignment(userId, {
            ...assignment,
            earnedPoints,
            totalPoints,
            category_id: categoryId,
          }).then(({ error }) => {
            if (error) {
              console.error('Failed to sync assignment update to cloud:', error);
              get().setGradesSyncStatus('error');
              get().setGradesSyncError('Failed to save to cloud — data is safe locally');
            }
          });
        }
      },
      deleteAssignment: (yearId, semesterId, subjectId, categoryId, assignmentId) => {
        // 1. Update local state
        set((state) => ({
          academicYears: state.academicYears.map((y) =>
            y.id === yearId
              ? {
                  ...y,
                  semesters: y.semesters.map((s) =>
                    s.id === semesterId
                      ? {
                          ...s,
                          subjects: s.subjects.map((sub) =>
                            sub.id === subjectId
                              ? {
                                  ...sub,
                                  categories: sub.categories.map((c) =>
                                    c.id === categoryId
                                      ? { ...c, assignments: c.assignments.filter((a) => a.id !== assignmentId) }
                                      : c
                                  ),
                                }
                              : sub
                          ),
                        }
                      : s
                  ),
                }
              : y
          ),
        }));
        
        // 2. Delete from Supabase
        const userId = get().user?.id;
        if (userId) {
          gradesSyncService.deleteAssignment(userId, assignmentId).then(({ error }) => {
            if (error) console.error('Failed to delete assignment from cloud:', error);
          });
        }
      },

      // Task Actions
      addTask: (title, priority = 'medium', dueDate) => {
        const newTask: Task = {
          id: generateId(),
          title,
          completed: false,
          priority,
          dueDate,
          createdAt: new Date(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },
      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        }));
      },

      // Pomodoro Actions
      setPomodoroMode: (mode) => {
        const TIMER_PRESETS = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
        set({
          pomodoroMode: mode,
          pomodoroTimeLeft: TIMER_PRESETS[mode],
          pomodoroIsRunning: false
        });
      },
      setPomodoroTimeLeft: (timeLeft) => set({ pomodoroTimeLeft: timeLeft }),
      setPomodoroIsRunning: (isRunning) => set({ pomodoroIsRunning: isRunning }),
      incrementPomodoroSessions: () => set((state) => ({ pomodoroSessions: state.pomodoroSessions + 1 })),
      resetPomodoroTimer: () => {
        const TIMER_PRESETS = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
        set((state) => ({
          pomodoroTimeLeft: TIMER_PRESETS[state.pomodoroMode],
          pomodoroIsRunning: false
        }));
      },

      // Quiz Actions
      addQuiz: (quiz) => {
        const newQuiz: Quiz = {
          ...quiz,
          id: generateId(),
          createdAt: new Date(),
        };
        set((state) => ({ quizzes: [...state.quizzes, newQuiz] }));
      },
      updateQuiz: (id, updates) => {
        set((state) => ({
          quizzes: state.quizzes.map((q) => (q.id === id ? { ...q, ...updates } : q)),
        }));
      },
      deleteQuiz: (id) => {
        set((state) => ({ quizzes: state.quizzes.filter((q) => q.id !== id) }));
      },

      // Chat Actions
      addChatMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        };
        set((state) => ({ chatMessages: [...state.chatMessages, newMessage] }));
      },
      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'ossm-study-hub-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        darkMode: state.darkMode,
        academicYears: state.academicYears,
        selectedYearId: state.selectedYearId,
        selectedSemesterId: state.selectedSemesterId,
        tasks: state.tasks,
        pomodoroMode: state.pomodoroMode,
        pomodoroTimeLeft: state.pomodoroTimeLeft,
        pomodoroSessions: state.pomodoroSessions,
        quizzes: state.quizzes,
      }),
    }
  )
);
