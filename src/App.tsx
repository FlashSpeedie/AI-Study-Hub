import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Sidebar } from "@/components/layout/Sidebar";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Grades from "./pages/Grades";
import PeriodicTable from "./pages/PeriodicTable";
import MathCalculator from "./pages/MathCalculator";
import AIAssistant from "./pages/AIAssistant";
import QuizGenerator from "./pages/QuizGenerator";
import Pomodoro from "./pages/Pomodoro";
import DormTasks from "./pages/DormTasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Sidebar>{children}</Sidebar>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
          <Route path="/periodic-table" element={<ProtectedRoute><PeriodicTable /></ProtectedRoute>} />
          <Route path="/calculator" element={<ProtectedRoute><MathCalculator /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizGenerator /></ProtectedRoute>} />
          <Route path="/pomodoro" element={<ProtectedRoute><Pomodoro /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><DormTasks /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
