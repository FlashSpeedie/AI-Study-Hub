import { useEffect, useState, Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { trackToolUse } from '@/utils/trackReferralToolUse';
import { useStore } from '@/store/useStore';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { BackgroundTimer } from "@/components/BackgroundTimer";
import { MiniPomodoroPreview } from "@/components/MiniPomodoroPreview";
import { MiniTaskPreview } from "@/components/MiniTaskPreview";
import { OnboardingModal } from "@/components/OnboardingModal";

import { GlobalSearch } from "@/components/GlobalSearch";
import { PageSkeleton } from "@/components/PageSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Session } from '@supabase/supabase-js';

// Lazy load all pages
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Grades = lazy(() => import('./pages/Grades'));
const FinalGradeCalculator = lazy(() => import('./pages/FinalGradeCalculator'));
const NoteTaking = lazy(() => import('./pages/NoteTaking'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const PeriodicTable = lazy(() => import('./pages/PeriodicTable'));
const MathCalculator = lazy(() => import('./pages/MathCalculator'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const AIDetector = lazy(() => import('./pages/AIDetector'));
const QuizGenerator = lazy(() => import('./pages/QuizGenerator'));
const Pomodoro = lazy(() => import('./pages/Pomodoro'));
const AITaskManager = lazy(() => import('./pages/AITaskManager'));
const AIClassroomTutor = lazy(() => import('./pages/AIClassroomTutor'));
const ClassroomHelper = lazy(() => import('./pages/ClassroomHelper'));
const LectureRecordings = lazy(() => import('./pages/LectureRecordings'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar - Fixed at top */}
      <TopNavbar />
      
      {/* Below navbar */}
      <div className="flex pt-14">
        {/* Sidebar - Fixed left (hidden on mobile) */}
        <Sidebar />
        
        {/* Main content - adjusted for fixed sidebar width */}
        <main 
          role="main"
          className="flex-1 ml-64 min-h-[calc(100vh-56px)] overflow-y-auto pb-16 md:pb-0"
        >
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const location = useLocation();
  const { darkMode, setDarkMode } = useStore();

  // Apply darkMode to document on change and on initial load
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Load saved theme from Supabase when session is confirmed
  useEffect(() => {
    const loadTheme = async () => {
      if (!session?.user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', session.user.id)
        .single();

      const profile = data as { theme?: string } | null;

      if (!error && profile?.theme) {
        if (profile.theme === 'dark') {
          setDarkMode(true);
        } else if (profile.theme === 'light') {
          setDarkMode(false);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDarkMode(prefersDark);
        }
      }
    };
    
    loadTheme();
  }, [session, setDarkMode]);

  // Track tool usage on route change
  useEffect(() => {
    const trackUsage = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) return
      
      const toolMap: Record<string, string> = {
        '/grades': 'grades',
        '/notes': 'notes',
        '/flashcards': 'flashcards',
        '/quiz': 'quiz',
        '/ai-assistant': 'ai-assistant',
        '/ai-detector': 'ai-detector',
        '/pomodoro': 'pomodoro',
        '/tasks': 'tasks',
        '/classroom': 'classroom',
        '/recordings': 'recordings',
      }
      
      const tool = toolMap[location.pathname]
      if (tool) {
        trackToolUse(currentSession.user.id, tool)
      }
    }
    
    trackUsage()
  }, [location.pathname])
  

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for onboarding
  useEffect(() => {
    if (session?.user) {
      setSessionUser(session.user);
      supabase.from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            setShowOnboarding(true);
            return;
          }
          if (!data?.onboarding_completed) {
            setShowOnboarding(true);
          }
        });
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <GlobalSearch />
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute session={session}><Dashboard /></ProtectedRoute>} />
        <Route path="/grades" element={<ProtectedRoute session={session}><Grades /></ProtectedRoute>} />
        <Route path="/final-grade" element={<ProtectedRoute session={session}><FinalGradeCalculator /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute session={session}><NoteTaking /></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute session={session}><Flashcards /></ProtectedRoute>} />
        <Route path="/periodic-table" element={<ProtectedRoute session={session}><PeriodicTable /></ProtectedRoute>} />
        <Route path="/calculator" element={<ProtectedRoute session={session}><MathCalculator /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute session={session}><AIAssistant /></ProtectedRoute>} />
        <Route path="/ai-detector" element={<ProtectedRoute session={session}><AIDetector /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute session={session}><QuizGenerator /></ProtectedRoute>} />
        <Route path="/pomodoro" element={<ProtectedRoute session={session}><Pomodoro /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute session={session}><AITaskManager /></ProtectedRoute>} />
        <Route path="/classroom" element={<ProtectedRoute session={session}><AIClassroomTutor /></ProtectedRoute>} />
        <Route path="/classroom-helper" element={<ProtectedRoute session={session}><ClassroomHelper /></ProtectedRoute>} />
        <Route path="/recordings" element={<ProtectedRoute session={session}><LectureRecordings /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute session={session}><Account /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Onboarding Modal */}
      {showOnboarding && sessionUser && (
        <OnboardingModal
          userId={sessionUser.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="app-scaled">
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <BackgroundTimer />
          <MiniPomodoroPreview />
          <MiniTaskPreview />
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
