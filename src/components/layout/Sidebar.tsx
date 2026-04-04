import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  FileText,
  Layers,
  MessageSquare,
  School,
  ClipboardList,
  Shield,
  CheckSquare,
  Atom,
  Calculator,
  Timer,
  Mic,
  Settings,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

// Nav item type
interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

// Section type
interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

// All nav sections with items
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'study',
    label: 'STUDY',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/grades', icon: BookOpen, label: 'Grades' },
      { path: '/final-grade', icon: GraduationCap, label: 'Final Grade Calc' },
      { path: '/notes', icon: FileText, label: 'AI Notes' },
      { path: '/flashcards', icon: Layers, label: 'Flashcards' },
    ],
  },
  {
    id: 'ai',
    label: 'AI TOOLS',
    items: [
      { path: '/ai-assistant', icon: MessageSquare, label: 'AI Assistant' },
      { path: '/classroom', icon: School, label: 'AI Classroom' },
      { path: '/quiz', icon: ClipboardList, label: 'Quiz Generator' },
      { path: '/ai-detector', icon: Shield, label: 'AI Detector' },
      { path: '/tasks', icon: CheckSquare, label: 'AI Tasks' },
    ],
  },
  {
    id: 'tools',
    label: 'TOOLS',
    items: [
      { path: '/periodic-table', icon: Atom, label: 'Periodic Table' },
      { path: '/calculator', icon: Calculator, label: 'Math Engine' },
      { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
      { path: '/recordings', icon: Mic, label: 'Recordings' },
    ],
  },
  {
    id: 'account',
    label: 'ACCOUNT',
    items: [
      { path: '/account', icon: Settings, label: 'Account & Settings' },
    ],
  },
];

interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<{ username?: string; avatar_url?: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user and profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        // Set user from session
        setUser({
          id: session.user.id,
          email: session.user.email,
        });

        // Fetch profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (!error && profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleNavItemClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Failed to sign out');
        return;
      }
      navigate('/login');
    } catch (error) {
      toast.error('An error occurred while signing out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Mobile: render nothing (handled by BottomTabBar)
  if (isMobile) {
    return null;
  }

  // Get initials for avatar
  const getInitials = () => {
    if (profile?.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.username) {
      return profile.username;
    }
    if (user?.email) {
      return user.email;
    }
    return 'User';
  };

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-30">
      {/* Logo / Brand - Single clean logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-black text-base">A</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-black tracking-tight text-foreground">
            APEX
          </span>
          <span className="text-[9px] font-medium text-muted-foreground tracking-widest uppercase">
            AI Study Hub
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.id} className={cn("mb-4", sectionIndex === 0 && "mt-0")}>
            {/* Section Label */}
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </span>
            </div>

            {/* Nav Items */}
            <div className="px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavItemClick(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                      isActive 
                        ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info Bar at Bottom */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-sidebar-accent animate-pulse" />
          ) : profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
              {getInitials()}
            </div>
          )}

          {/* Username */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {getDisplayName()}
            </p>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/account')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Go to account settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
