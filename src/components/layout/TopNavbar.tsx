import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function TopNavbar() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useStore();
  const isMobile = useIsMobile();
  
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user info from Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || null);
        setCurrentUserId(session.user.id);
        
        // Get profile for avatar
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', session.user.id)
          .single();
        
        if (profile && !profileError) {
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
          if (profile.username && !session.user.user_metadata?.username) {
            setUsername(profile.username);
          }
        }
      }
      setIsLoading(false);
    };
    getUser();
  }, []);

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const event = new KeyboardEvent('keydown', { 
          key: 'k', 
          metaKey: true, 
          bubbles: true 
        });
        document.dispatchEvent(event);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const openSearch = () => {
    const event = new KeyboardEvent('keydown', { 
      key: 'k', 
      metaKey: true, 
      bubbles: true 
    });
    document.dispatchEvent(event);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-40 flex items-center px-4">
      {/* Left: Logo only - w-16 to align with sidebar */}
      <div className="w-16 flex items-center justify-start">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center w-8 h-8">
          <span className="text-white font-black text-sm">A</span>
        </div>
      </div>

      {/* Center: Search bar (hidden on mobile) */}
      {!isMobile && (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={openSearch}
            className="max-w-md w-full mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-muted h-9 cursor-pointer"
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: Icons */}
      <div className="flex items-center gap-2">
        {/* Mobile: Logo only (no text) */}

        {/* Notifications Bell */}
        {currentUserId && !isLoading && (
          <button
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* User avatar */}
        <button
          onClick={() => navigate('/account')}
          className="w-9 h-9 rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all flex-shrink-0 cursor-pointer"
          aria-label="Go to account"
        >
          {isLoading ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={username || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">
                {getInitials(username || 'User')}
              </span>
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
