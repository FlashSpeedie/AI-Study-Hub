import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from "@/components/layout/Sidebar";
import { BackgroundTimer } from "@/components/BackgroundTimer";
import { MiniPomodoroPreview } from "@/components/MiniPomodoroPreview";
import { MiniTaskPreview } from "@/components/MiniTaskPreview";
import { Session } from '@supabase/supabase-js';
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Grades from "./pages/Grades";
import FinalGradeCalculator from "./pages/FinalGradeCalculator";
import NoteTaking from "./pages/NoteTaking";
import Flashcards from "./pages/Flashcards";
import PeriodicTable from "./pages/PeriodicTable";
import MathCalculator from "./pages/MathCalculator";
import AIAssistant from "./pages/AIAssistant";
import AIDetector from "./pages/AIDetector";
import QuizGenerator from "./pages/QuizGenerator";
import Pomodoro from "./pages/Pomodoro";
import AITaskManager from "./pages/AITaskManager";
import AIClassroomTutor from "./pages/AIClassroomTutor";
import Maintenance from "./pages/Maintenance";
import LectureRecordings from "./pages/LectureRecordings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/" replace />;
  return <Sidebar>{children}</Sidebar>;
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
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
      <Route path="/classroom-helper" element={<ProtectedRoute session={session}><Maintenance /></ProtectedRoute>} />
      <Route path="/recordings" element={<ProtectedRoute session={session}><LectureRecordings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackgroundTimer />
        <MiniPomodoroPreview />
        <MiniTaskPreview />
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
