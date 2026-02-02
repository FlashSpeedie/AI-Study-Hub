import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  X, 
  Download, 
  Loader2, 
  MessageSquareText,
  FileAudio,
  FileType,
  Sparkle,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Recording {
  id: string;
  name: string;
  audio_url: string | null;
  notes: string | null;
  summary: string | null;
  key_points: string[];
  transcript?: string | null;
}

interface RecordingNotesProps {
  recording: Recording;
  onSave: (notes: string, summary: string, keyPoints: string[]) => void;
  isTranscribing?: boolean;
  onRetranscribe?: () => void;
}

export default function RecordingNotes({ recording, onSave, isTranscribing = false, onRetranscribe }: RecordingNotesProps) {
  const [notes, setNotes] = useState(recording.notes || '');
  const [summary, setSummary] = useState(recording.summary || '');
  const [keyPoints, setKeyPoints] = useState<string[]>(recording.key_points || []);
  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [aiAction, setAiAction] = useState<'summarize' | 'explain' | 'chat' | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotes(recording.notes || '');
    setSummary(recording.summary || '');
    setKeyPoints(recording.key_points || []);
    setHasChanges(false);
  }, [recording]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasChanges(true);
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    setHasChanges(true);
  };

  const addKeyPoint = () => {
    if (!newKeyPoint.trim()) return;
    setKeyPoints(prev => [...prev, newKeyPoint.trim()]);
    setNewKeyPoint('');
    setHasChanges(true);
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(notes, summary, keyPoints);
    setHasChanges(false);
  };

  // Generate AI summary
  const generateAISummary = async () => {
    if (!notes.trim() && !recording.transcript?.trim()) {
      toast.error('Please add some notes or transcript first');
      return;
    }

    setIsGenerating(true);
    setAiAction('summarize');
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Based on these lecture notes/transcript, please provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points/takeaways

Content:
${notes || recording.transcript || ''}

Format your response as:
SUMMARY:
[Your summary here]

KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]`
            }
          ],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const content = data?.response || '';

      // Parse the response
      const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=KEY POINTS:|$)/i);
      const keyPointsMatch = content.match(/KEY POINTS:\s*([\s\S]*?)$/i);

      if (summaryMatch) {
        setSummary(summaryMatch[1].trim());
      }

      if (keyPointsMatch) {
        const points = keyPointsMatch[1]
          .split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
        setKeyPoints(points);
      }

      setHasChanges(true);
      toast.success('Summary generated!');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGenerating(false);
      setAiAction(null);
    }
  };

  // Explain a concept
  const explainConcept = async (concept: string) => {
    if (!concept.trim()) return;

    setIsGenerating(true);
    setAiAction('explain');
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Explain the following concept from the lecture in detail. Use simple language and provide examples if helpful.

Context from lecture:
${notes || recording.transcript || 'No context available'}

Concept to explain: ${concept}

Provide a clear, educational explanation:`
            }
          ],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Explanation generated!');
      // Show explanation in a modal or expand a section
      return data?.response || '';
    } catch (error) {
      console.error('Error explaining concept:', error);
      toast.error('Failed to explain concept');
      return null;
    } finally {
      setIsGenerating(false);
      setAiAction(null);
    }
  };

  // Chat about the recording
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI tutor helping the student understand their lecture recording.
Use the following context from the lecture when answering:
${notes || recording.transcript || 'No lecture content available'}

Provide helpful, educational responses.`
            },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setChatMessages(prev => [...prev, { role: 'assistant', content: data?.response || 'I apologize, but I could not generate a response.' }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Download audio file
  const downloadAudio = () => {
    if (!recording.audio_url) {
      toast.error('No audio file available');
      return;
    }

    const a = document.createElement('a');
    a.href = recording.audio_url;
    a.download = `${recording.name.replace(/\s+/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(recording.audio_url!);
    toast.success('Audio downloaded');
  };

  // Export as PDF
  const exportAsPDF = () => {
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>${recording.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .meta { color: #888; font-size: 14px; margin-bottom: 20px; }
    .section { margin-bottom: 30px; }
    .key-points { list-style-type: none; padding: 0; }
    .key-points li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .key-points li:before { content: "• "; color: #666; }
  </style>
</head>
<body>
  <h1>${recording.name}</h1>
  <p class="meta">Generated by AI Study Hub</p>

  ${summary ? `<div class="section"><h2>Summary</h2><p>${summary}</p></div>` : ''}

  ${keyPoints.length > 0 ? `<div class="section"><h2>Key Points</h2><ul class="key-points">${keyPoints.map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}

  ${recording.transcript ? `<div class="section"><h2>Transcript</h2><p>${recording.transcript}</p></div>` : ''}

  ${notes ? `<div class="section"><h2>Full Notes</h2><p>${notes}</p></div>` : ''}
</body>
</html>`;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('PDF exported (HTML format)');
  };

  // Export notes as markdown
  const exportNotes = () => {
    const content = `# ${recording.name}

## Summary
${summary || 'No summary yet'}

## Key Points
${keyPoints.length > 0 ? keyPoints.map(p => `- ${p}`).join('\n') : 'No key points yet'}

## Transcript
${recording.transcript || 'No transcript available'}

## Full Notes
${notes || 'No notes yet'}

---
Generated by AI Study Hub
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name.replace(/\s+/g, '_')}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Notes exported');
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Transcript Section */}
      <AnimatePresence>
        {recording.transcript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquareText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Auto-Transcription</h3>
                    <div className="flex gap-1">
                      {onRetranscribe && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRetranscribe}
                          disabled={isTranscribing}
                        >
                          {isTranscribing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(recording.transcript || '')}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotes(prev => prev ? `${prev}\n\n--- Transcript ---\n${recording.transcript}` : recording.transcript || '');
                          setHasChanges(true);
                          toast.success('Transcript added to notes');
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add to Notes
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {recording.transcript}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Options */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Options
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAudio}
            disabled={!recording.audio_url}
          >
            <FileAudio className="w-4 h-4 mr-2" />
            Audio File
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsPDF}
          >
            <FileType className="w-4 h-4 mr-2" />
            Export as PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportNotes}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Notes
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notes">Full Notes</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="keypoints">Key Points</TabsTrigger>
          <TabsTrigger value="chat">
            <Bot className="w-4 h-4 mr-2" />
            AI Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Lecture Notes</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISummary}
                    disabled={isGenerating || (!notes.trim() && !recording.transcript?.trim())}
                  >
                    {isGenerating && aiAction === 'summarize' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Summary
                  </Button>
                </div>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Type your lecture notes here... Include key concepts, definitions, examples, and anything important from the lecture."
                className="min-h-[300px] resize-none"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Summary</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAISummary}
                  disabled={isGenerating || (!notes.trim() && !recording.transcript?.trim())}
                >
                  {isGenerating && aiAction === 'summarize' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkle className="w-4 h-4 mr-2" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={summary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                placeholder="A brief summary of the lecture content..."
                className="min-h-[150px] resize-none"
              />
              {summary && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(summary)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Summary
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="keypoints">
          <Card className="p-4">
            <div className="space-y-4">
              <Label>Key Points & Takeaways</Label>

              {/* Add new key point */}
              <div className="flex gap-2">
                <Input
                  value={newKeyPoint}
                  onChange={(e) => setNewKeyPoint(e.target.value)}
                  placeholder="Add a key point..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyPoint();
                    }
                  }}
                />
                <Button onClick={addKeyPoint} disabled={!newKeyPoint.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Key points list */}
              <div className="space-y-2">
                {keyPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No key points yet. Add some manually or generate with AI.
                  </p>
                ) : (
                  keyPoints.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 p-3 bg-muted rounded-lg group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="flex-1 text-sm">{point}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            explainConcept(point).then(() => {
                              // Could show explanation in a modal
                            });
                          }}
                        >
                          <Sparkle className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(point)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeKeyPoint(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>AI Chat about this Lecture</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatMessages([])}
                  disabled={chatMessages.length === 0}
                >
                  Clear Chat
                </Button>
              </div>

              {/* Chat messages */}
              <ScrollArea className="h-[300px] rounded-lg border bg-muted/30 p-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Ask questions about your lecture recording</p>
                    <p className="text-xs mt-1">Example: "What was the main topic?" or "Explain the concept of..."</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-2",
                          message.role === 'assistant' ? "flex-row" : "flex-row-reverse"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          message.role === 'assistant' ? "bg-primary/10" : "bg-muted"
                        )}>
                          {message.role === 'assistant' ? (
                            <Bot className="w-4 h-4 text-primary" />
                          ) : (
                            <span className="text-xs">You</span>
                          )}
                        </div>
                        <div className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          message.role === 'assistant' ? "bg-primary/5" : "bg-muted"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isChatting && (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                        <div className="bg-primary/5 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">Thinking...</p>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Chat input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about the lecture..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  disabled={isChatting}
                />
                <Button onClick={sendChatMessage} disabled={isChatting || !chatInput.trim()}>
                  <MessageSquareText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={exportNotes}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Notes
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          Save Notes
        </Button>
      </div>
    </div>
  );
}
