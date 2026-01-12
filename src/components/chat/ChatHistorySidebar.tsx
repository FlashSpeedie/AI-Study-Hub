import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  format, 
  isToday, 
  isYesterday, 
  isThisWeek, 
  isThisMonth, 
  isThisYear, 
  parseISO 
} from 'date-fns';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  preview?: string;
}

interface ChatHistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isLoading?: boolean;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  thisMonth: Conversation[];
  thisYear: Conversation[];
  older: Conversation[];
}

export default function ChatHistorySidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
}: ChatHistorySidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    today: true,
    yesterday: true,
    thisWeek: true,
    thisMonth: false,
    thisYear: false,
    older: false,
  });

  const groupConversations = (convs: Conversation[]): GroupedConversations => {
    const groups: GroupedConversations = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      thisYear: [],
      older: [],
    };

    convs.forEach(conv => {
      const date = parseISO(conv.created_at);
      
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(conv);
      } else if (isThisMonth(date)) {
        groups.thisMonth.push(conv);
      } else if (isThisYear(date)) {
        groups.thisYear.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const grouped = groupConversations(conversations);

  const renderSection = (
    title: string, 
    key: keyof GroupedConversations, 
    icon: React.ReactNode
  ) => {
    const items = grouped[key];
    if (items.length === 0) return null;

    const isExpanded = expandedSections[key];

    return (
      <div key={key} className="mb-2">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {icon}
          <span>{title}</span>
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
            {items.length}
          </span>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {items.map(conv => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group relative"
                >
                  <button
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                      "hover:bg-muted/50 flex items-start gap-2",
                      activeConversationId === conv.id && "bg-primary/10 border-l-2 border-primary"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || 'New Conversation'}
                      </p>
                      {conv.preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.preview}
                        </p>
                      )}
                    </div>
                  </button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-64 h-full border-r border-border bg-card flex flex-col">
      <div className="p-3 border-b border-border">
        <Button 
          onClick={onNewConversation} 
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              {renderSection('Today', 'today', <Clock className="w-3 h-3" />)}
              {renderSection('Yesterday', 'yesterday', <Clock className="w-3 h-3" />)}
              {renderSection('This Week', 'thisWeek', <Calendar className="w-3 h-3" />)}
              {renderSection('This Month', 'thisMonth', <Calendar className="w-3 h-3" />)}
              {renderSection('This Year', 'thisYear', <Calendar className="w-3 h-3" />)}
              {renderSection('Previous Years', 'older', <Calendar className="w-3 h-3" />)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
