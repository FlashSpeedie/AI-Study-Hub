import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Grid3x3,
  X,
  GraduationCap,
  Layers,
  MessageSquare,
  School,
  ClipboardList,
  Shield,
  Atom,
  Calculator,
  Timer,
  Mic,
  Gamepad2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_TABS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/grades', icon: BookOpen, label: 'Grades' },
  { path: '/notes', icon: FileText, label: 'Notes' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: 'more', icon: Grid3x3, label: 'More' },
];

const ALL_MOBILE_ITEMS = [
  { category: 'STUDY', icon: BookOpen, items: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/grades', icon: BookOpen, label: 'Grades' },
    { path: '/final-grade', icon: GraduationCap, label: 'Final Grade' },
    { path: '/notes', icon: FileText, label: 'Notes' },
    { path: '/flashcards', icon: Layers, label: 'Flashcards' },
  ]},
  { category: 'AI TOOLS', icon: Sparkles, items: [
    { path: '/ai-assistant', icon: MessageSquare, label: 'AI Assistant' },
    { path: '/classroom', icon: School, label: 'AI Classroom' },
    { path: '/quiz', icon: ClipboardList, label: 'Quiz Generator' },
    { path: '/ai-detector', icon: Shield, label: 'AI Detector' },
    { path: '/tasks', icon: CheckSquare, label: 'AI Tasks' },
  ]},
  { category: 'TOOLS', icon: Wrench, items: [
    { path: '/periodic-table', icon: Atom, label: 'Periodic Table' },
    { path: '/calculator', icon: Calculator, label: 'Math Engine' },
    { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
    { path: '/recordings', icon: Mic, label: 'Recordings' },
  ]},
  { category: 'FUN', icon: Gamepad2, items: [
    { path: '/games', icon: Gamepad2, label: 'Business Empire' },
  ]},
  { category: 'ACCOUNT', icon: Settings, items: [
    { path: '/account', icon: Settings, label: 'Account' },
  ]},
];

// Need to import Sparkles and Wrench separately
import { Sparkles, Wrench } from 'lucide-react';

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleTabClick = (item: typeof MOBILE_TABS[0]) => {
    if (item.path === 'more') {
      setMoreOpen(true);
    } else {
      navigate(item.path);
    }
  };

  const handleNavItemClick = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 md:hidden">
        <div className="flex items-center justify-around h-full">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = item.path !== 'more' && location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleTabClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Bottom Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMoreOpen(false)}
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl z-50 md:hidden max-h-[80vh] overflow-y-auto"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted rounded-full" />
              </div>
              
              {/* Close button */}
              <button
                onClick={() => setMoreOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Title */}
              <h2 className="text-lg font-semibold px-4 pb-4">Navigation</h2>

              {/* Grid of items */}
              <div className="px-4 pb-8">
                {ALL_MOBILE_ITEMS.map((section) => (
                  <div key={section.category} className="mb-4">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                      {section.category}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavItemClick(item.path)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors",
                              isActive 
                                ? "bg-primary/10 text-primary" 
                                : "hover:bg-muted text-foreground/70"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs text-center">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
