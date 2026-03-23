import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, CheckSquare, BookOpen, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  type: 'note' | 'task' | 'subject';
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    notes: SearchResult[];
    tasks: SearchResult[];
    subjects: SearchResult[];
  }>({ notes: [], tasks: [], subjects: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const allResults = [
    ...results.notes.map(r => ({ ...r, icon: FileText })),
    ...results.tasks.map(r => ({ ...r, icon: CheckSquare })),
    ...results.subjects.map(r => ({ ...r, icon: BookOpen }))
  ];

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ notes: [], tasks: [], subjects: [] });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    setLoading(true);
    try {
      const [notesRes, tasksRes, subjectsRes] = await Promise.all([
        supabase
          .from('notes')
          .select('id, title')
          .eq('user_id', session.user.id)
          .ilike('title', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title')
          .eq('user_id', session.user.id)
          .ilike('title', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('subjects')
          .select('id, name')
          .eq('user_id', session.user.id)
          .ilike('name', `%${searchQuery}%`)
          .limit(5)
      ]);

      setResults({
        notes: (notesRes.data || []).map(n => ({ ...n, type: 'note' as const })),
        tasks: (tasksRes.data || []).map(t => ({ ...t, title: t.title, type: 'task' as const })),
        subjects: (subjectsRes.data || []).map(s => ({ ...s, title: s.name, type: 'subject' as const }))
      });
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        search(query);
      }, 200);
    } else {
      setResults({ notes: [], tasks: [], subjects: [] });
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (result: SearchResult & { icon: any }) => {
    switch (result.type) {
      case 'note':
        navigate('/notes');
        break;
      case 'task':
        navigate('/tasks');
        break;
      case 'subject':
        navigate('/grades');
        break;
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults({ notes: [], tasks: [], subjects: [] });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-full max-w-xl z-50">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden mx-4">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes, tasks, subjects..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              autoFocus
            />
            {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            <button
              onClick={handleClose}
              className="p-1 hover:bg-muted rounded"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {!query.trim() ? (
              <div className="p-8 text-center text-muted-foreground">
                Type to search across your notes, tasks, and subjects
              </div>
            ) : allResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No results for "{query}"
              </div>
            ) : (
              <div className="py-2">
                {results.notes.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Notes ({results.notes.length})
                    </p>
                    {results.notes.map((result, idx) => {
                      const Icon = FileText;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect({ ...result, icon: Icon })}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                            selectedIndex === idx ? "bg-primary/10" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium flex-1 truncate">{result.title}</span>
                          <span className="text-xs text-muted-foreground">note</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {results.tasks.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Tasks ({results.tasks.length})
                    </p>
                    {results.tasks.map((result, idx) => {
                      const Icon = CheckSquare;
                      const actualIdx = results.notes.length + idx;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect({ ...result, icon: Icon })}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                            selectedIndex === actualIdx ? "bg-primary/10" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium flex-1 truncate">{result.title}</span>
                          <span className="text-xs text-muted-foreground">task</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {results.subjects.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Subjects ({results.subjects.length})
                    </p>
                    {results.subjects.map((result, idx) => {
                      const Icon = BookOpen;
                      const actualIdx = results.notes.length + results.tasks.length + idx;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect({ ...result, icon: Icon })}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                            selectedIndex === actualIdx ? "bg-primary/10" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium flex-1 truncate">{result.title}</span>
                          <span className="text-xs text-muted-foreground">subject</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Export a hook to trigger search from outside
export function useGlobalSearch() {
  return { open: () => setIsOpen(true) };
}

let setIsOpen: (open: boolean) => void = () => {};

export function setGlobalSearchController(setOpenFn: (open: boolean) => void) {
  setIsOpen = setOpenFn;
}

export default GlobalSearch;
