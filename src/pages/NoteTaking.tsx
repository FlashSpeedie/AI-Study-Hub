import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  Save,
  FolderOpen,
  Clock,
  ChevronLeft,
  Loader2,
  BookOpen,
  List,
  CheckSquare,
  Download,
  Volume2,
  VolumeX,
  Hash,
  Copy,
  Undo,
  Type,
  Folder,
  Tag,
  Palette,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface NoteFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  color: string | null;
}

const FOLDER_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' },
];

// Helper function to parse SSE streaming response
const parseSSEResponse = (rawText: string): string => {
  const lines = rawText.split('\n');
  let content = '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  }
  
  return content.trim();
};

// Convert markdown to plain readable text
const formatMarkdownToPlainText = (text: string): string => {
  return text
    // Remove bold markers **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic markers *text* or _text_
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Convert headers to plain text with newlines
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')
    // Convert bullet points to clean dashes
    .replace(/^\s*[-*+]\s+/gm, '• ')
    // Convert numbered lists
    .replace(/^\s*\d+\.\s+/gm, (match) => match.trim() + ' ')
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Calculate word count and reading time
const getTextStats = (text: string) => {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const characters = text.length;
  const readingTimeMinutes = Math.ceil(words / 200); // Average reading speed
  return { words, characters, readingTimeMinutes };
};

export default function NoteTaking() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteDialog, setNoteDialog] = useState<{ 
    open: boolean; 
    title: string; 
    subject: string;
    folderId: string | null;
    color: string;
  }>({ 
    open: false, 
    title: '', 
    subject: '',
    folderId: null,
    color: '#6366f1'
  });
  const [folderDialog, setFolderDialog] = useState<{
    open: boolean;
    name: string;
    color: string;
  }>({
    open: false,
    name: '',
    color: '#6366f1'
  });
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [aiAction, setAiAction] = useState<'summarize' | 'outline' | 'questions' | 'explain' | 'keyterms' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setContentHistory([selectedNote.content]);
      setHistoryIndex(0);
    }
  }, [selectedNote]);

  // Track content changes for undo
  const updateContent = useCallback((newContent: string) => {
    setEditContent(newContent);
    setContentHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undoContent = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setEditContent(contentHistory[historyIndex - 1]);
    }
  };

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const mappedNotes: Note[] = (data || []).map(n => ({
        id: n.id,
        title: n.title,
        content: n.content || '',
        subject: n.subject || 'General',
        created_at: n.created_at,
        updated_at: n.updated_at,
        folder_id: n.folder_id || null,
        color: n.color || '#6366f1',
      }));
      
      setNotes(mappedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const createFolder = async () => {
    if (!folderDialog.name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('note_folders')
        .insert({
          user_id: user.id,
          name: folderDialog.name,
          color: folderDialog.color,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Folder created!');
      setFolderDialog({ open: false, name: '', color: '#6366f1' });
      setFolders([...folders, data]);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      
      toast.success('Folder deleted');
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const createNote = async () => {
    if (!noteDialog.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: noteDialog.title,
          content: '',
          subject: noteDialog.subject || 'General',
          folder_id: noteDialog.folderId,
          color: noteDialog.color,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Note created!');
      setNoteDialog({ open: false, title: '', subject: '', folderId: null, color: '#6366f1' });
      
      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        subject: data.subject || 'General',
        created_at: data.created_at,
        updated_at: data.updated_at,
        folder_id: data.folder_id,
        color: data.color || '#6366f1',
      };
      
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: editTitle,
          content: editContent,
        })
        .eq('id', selectedNote.id);

      if (error) throw error;
      
      const updatedNote = { ...selectedNote, title: editTitle, content: editContent, updated_at: new Date().toISOString() };
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
      toast.success('Note saved!');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      
      toast.success('Note deleted');
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const processWithAI = async (action: 'summarize' | 'outline' | 'questions' | 'explain' | 'keyterms') => {
    if (!selectedNote || !editContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    setProcessing(true);
    setAiAction(action);
    
    try {
      const prompts = {
        summarize: `Summarize the following notes concisely in 3-5 bullet points:\n\n${editContent}`,
        outline: `Create a structured outline from these notes with clear headings and subpoints:\n\n${editContent}`,
        questions: `Generate 5 study questions (mix of multiple choice and short answer) based on these notes:\n\n${editContent}`,
        explain: `Explain the main concepts in these notes in simpler terms, as if teaching to a beginner:\n\n${editContent}`,
        keyterms: `Extract and define the key terms and vocabulary from these notes in a glossary format:\n\n${editContent}`,
      };

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{ role: 'user', content: prompts[action] }],
        },
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('402')) {
          throw new Error('Please add credits to your workspace.');
        } else {
          throw new Error(data.error);
        }
      }

      const cleanContent = data?.response || '';

      if (!cleanContent) {
        throw new Error('No content received from AI');
      }

      // Append the AI result to the content
      const separator = '\n\n---\n\n';
      const labels: Record<string, string> = {
        summarize: '📝 Summary',
        outline: '📋 Outline',
        questions: '❓ Study Questions',
        explain: '💡 Simplified Explanation',
        keyterms: '📚 Key Terms & Definitions',
      };
      
      // Format the AI content to remove markdown artifacts
      const formattedContent = formatMarkdownToPlainText(cleanContent);
      const newContent = `${editContent}${separator}${labels[action]}\n\n${formattedContent}`;
      updateContent(newContent);
      toast.success(`${labels[action]} generated!`);
    } catch (error) {
      console.error('Error processing with AI:', error);
      toast.error('Failed to process with AI');
    } finally {
      setProcessing(false);
      setAiAction(null);
    }
  };

  // Text-to-Speech functionality
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (!editContent.trim()) {
        toast.error('No content to read');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(editContent);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Export as text file
  const exportNote = () => {
    const content = `# ${editTitle}\n\nSubject: ${selectedNote?.subject || 'General'}\nDate: ${format(new Date(), 'MMMM d, yyyy')}\n\n${editContent}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editTitle.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Note exported!');
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editContent);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const textStats = getTextStats(editContent);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFolder = selectedFolderId ? note.folder_id === selectedFolderId : true;
    
    return matchesSearch && matchesFolder;
  });

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    return folders.find(f => f.id === folderId)?.name || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Note Editor View
  if (selectedNote) {
    return (
      <div className="max-w-5xl mx-auto animate-in">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setSelectedNote(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Notes
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveNote} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>

        <Card className="p-6">
          {/* Title */}
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-2xl font-display font-bold border-0 px-0 mb-4 focus-visible:ring-0"
            placeholder="Note title..."
          />

          {/* Stats Bar */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="w-4 h-4" />
              {textStats.words} words
            </span>
            <span className="flex items-center gap-1">
              <Type className="w-4 h-4" />
              {textStats.characters} characters
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              ~{textStats.readingTimeMinutes} min read
            </span>
          </div>

          {/* AI Actions */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b flex-wrap">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              AI Actions:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processWithAI('summarize')}
              disabled={processing}
              className="gap-1"
            >
              {processing && aiAction === 'summarize' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              Summarize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processWithAI('outline')}
              disabled={processing}
              className="gap-1"
            >
              {processing && aiAction === 'outline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <List className="w-3 h-3" />}
              Outline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processWithAI('questions')}
              disabled={processing}
              className="gap-1"
            >
              {processing && aiAction === 'questions' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
              Questions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processWithAI('explain')}
              disabled={processing}
              className="gap-1"
            >
              {processing && aiAction === 'explain' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Simplify
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processWithAI('keyterms')}
              disabled={processing}
              className="gap-1"
            >
              {processing && aiAction === 'keyterms' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              Key Terms
            </Button>
          </div>

          {/* Tools Bar */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b flex-wrap">
            <span className="text-sm text-muted-foreground">Tools:</span>
            <Button variant="ghost" size="sm" onClick={toggleSpeech} className="gap-1">
              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {isSpeaking ? 'Stop' : 'Read Aloud'}
            </Button>
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="gap-1">
              <Copy className="w-3 h-3" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={exportNote} className="gap-1">
              <Download className="w-3 h-3" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={undoContent} disabled={historyIndex <= 0} className="gap-1">
              <Undo className="w-3 h-3" />
              Undo
            </Button>
          </div>

          {/* Content */}
          <Textarea
            value={editContent}
            onChange={(e) => updateContent(e.target.value)}
            className="min-h-[400px] resize-none border-0 px-0 focus-visible:ring-0 font-mono text-sm leading-relaxed"
            placeholder="Start typing your notes..."
          />

          {/* Footer */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FolderOpen className="w-4 h-4" />
              {selectedNote.subject}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last updated: {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        </Card>
      </div>
    );
  }

  // Notes List View
  return (
    <div className="max-w-6xl mx-auto animate-in">
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">AI Note Taking</h1>
        </motion.div>
        <p className="text-muted-foreground">
          Take notes and use AI to summarize, create outlines, and generate study questions
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setFolderDialog({ open: true, name: '', color: '#6366f1' })} className="gap-2">
          <Folder className="w-4 h-4" />
          New Folder
        </Button>
        <Button onClick={() => setNoteDialog({ open: true, title: '', subject: '', folderId: selectedFolderId, color: '#6366f1' })} className="gap-2">
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      {/* Folders Bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={selectedFolderId === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFolderId(null)}
          className="gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          All Notes
        </Button>
        <AnimatePresence>
          {folders.map((folder) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <Button
                variant={selectedFolderId === folder.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFolderId(folder.id)}
                className="gap-2 pr-8"
                style={{ 
                  borderColor: selectedFolderId !== folder.id ? folder.color : undefined,
                  backgroundColor: selectedFolderId === folder.id ? folder.color : undefined,
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedFolderId === folder.id ? 'white' : folder.color }}
                />
                {folder.name}
              </Button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matching notes' : 'No notes yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? 'Try a different search term' : 'Create your first note to get started!'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setNoteDialog({ open: true, title: '', subject: '', folderId: null, color: '#6366f1' })} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Note
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note, index) => {
            const folderName = getFolderName(note.folder_id);
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-5 cursor-pointer hover:shadow-soft transition-all group h-full flex flex-col relative overflow-hidden"
                  onClick={() => setSelectedNote(note)}
                >
                  {/* Color accent bar */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: note.color || '#6366f1' }}
                  />
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div 
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: `${note.color || '#6366f1'}20`,
                          color: note.color || '#6366f1'
                        }}
                      >
                        <Tag className="w-3 h-3 inline mr-1" />
                        {note.subject}
                      </div>
                      {folderName && (
                        <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {folderName}
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{note.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                    {note.content || 'No content yet...'}
                  </p>
                  <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(note.updated_at), 'MMM d, yyyy')}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog({ ...noteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="noteTitle">Title</Label>
              <Input
                id="noteTitle"
                value={noteDialog.title}
                onChange={(e) => setNoteDialog({ ...noteDialog, title: e.target.value })}
                placeholder="e.g., Biology Chapter 5 Notes"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="noteSubject">Subject/Tag</Label>
              <Input
                id="noteSubject"
                value={noteDialog.subject}
                onChange={(e) => setNoteDialog({ ...noteDialog, subject: e.target.value })}
                placeholder="e.g., Biology"
                className="mt-1"
              />
            </div>
            {folders.length > 0 && (
              <div>
                <Label>Folder (optional)</Label>
                <Select 
                  value={noteDialog.folderId || 'none'} 
                  onValueChange={(val) => setNoteDialog({ ...noteDialog, folderId: val === 'none' ? null : val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: folder.color }} />
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNoteDialog({ ...noteDialog, color: color.value })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      noteDialog.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, title: '', subject: '', folderId: null, color: '#6366f1' })}>Cancel</Button>
            <Button onClick={createNote}>Create Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialog.open} onOpenChange={(open) => setFolderDialog({ ...folderDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={folderDialog.name}
                onChange={(e) => setFolderDialog({ ...folderDialog, name: e.target.value })}
                placeholder="e.g., Science Classes"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFolderDialog({ ...folderDialog, color: color.value })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      folderDialog.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog({ open: false, name: '', color: '#6366f1' })}>Cancel</Button>
            <Button onClick={createFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
