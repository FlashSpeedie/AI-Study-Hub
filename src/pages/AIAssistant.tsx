import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Upload, Trash2, Loader2, FileText, X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ChatHistorySidebar, { Conversation } from '@/components/chat/ChatHistorySidebar';
import { formatAIResponse } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select('conversation_id, title, created_at, content, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation_id and get unique conversations
      const conversationMap = new Map<string, Conversation>();
      
      (data || []).forEach(msg => {
        if (msg.conversation_id && !conversationMap.has(msg.conversation_id)) {
          conversationMap.set(msg.conversation_id, {
            id: msg.conversation_id,
            title: msg.title || 'New Conversation',
            created_at: msg.created_at,
            preview: msg.role === 'user' ? msg.content.substring(0, 50) : undefined,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setUploadedFile(null);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (activeConversationId === conversationId) {
        startNewConversation();
      }
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/jpg'];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Please upload PDF, Word, text, or image files');
      return;
    }

    try {
      let content = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
      } else {
        content = `[Uploaded file: ${file.name} (${file.type}). Please analyze this document and answer questions about it.]`;
      }

      setUploadedFile({ name: file.name, content });
      toast.success(`File "${file.name}" uploaded successfully`);
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const generateTitle = (content: string): string => {
    // Generate a short title from the first user message
    const words = content.trim().split(/\s+/).slice(0, 5);
    let title = words.join(' ');
    if (content.split(/\s+/).length > 5) {
      title += '...';
    }
    return title.substring(0, 50);
  };

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;

    let userContent = input.trim();
    if (uploadedFile) {
      userContent = `[Context from uploaded file "${uploadedFile.name}":\n${uploadedFile.content.substring(0, 4000)}]\n\n${userContent || 'Please analyze this document and summarize the key points.'}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || 'Analyze the uploaded file',
    };

    // Create new conversation ID if needed
    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      setActiveConversationId(conversationId);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedFile(null);
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save user message to database
      const title = messages.length === 0 ? generateTitle(userMessage.content) : undefined;
      
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content,
        title: title,
      });

      // Update conversations list
      if (title) {
        setConversations(prev => [{
          id: conversationId!,
          title,
          created_at: new Date().toISOString(),
          preview: userMessage.content.substring(0, 50),
        }, ...prev]);
      }

      // Get the user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userContent }].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId = Date.now().toString() + '-assistant';

      // Add empty assistant message
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => 
                    prev.map(m => m.id === assistantMessageId 
                      ? { ...m, content: assistantContent } 
                      : m
                    )
                  );
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save assistant message to database
      if (assistantContent) {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantContent,
        });
      }

    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
      setMessages(prev => prev.filter(m => m.role !== 'assistant' || m.content));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto animate-in">
      {/* Sidebar */}
      {sidebarOpen && (
        <ChatHistorySidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={loadConversation}
          onNewConversation={startNewConversation}
          onDeleteConversation={deleteConversation}
          isLoading={isLoadingHistory}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </Button>
          <Bot className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-display font-bold">AI Scholar Assistant</h1>
            <p className="text-xs text-muted-foreground">Your intelligent study companion</p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-0 rounded-none">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                  <p className="text-muted-foreground max-w-md">
                    Ask questions about your coursework, upload documents for analysis, or get help with problem-solving.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">
                      {msg.role === 'assistant' ? formatAIResponse(msg.content) : msg.content}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Uploaded File Indicator */}
          {uploadedFile && (
            <div className="px-4 py-2 border-t border-border bg-accent/50">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1 truncate">{uploadedFile.name}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setUploadedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload a file"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} disabled={isLoading || (!input.trim() && !uploadedFile)}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
