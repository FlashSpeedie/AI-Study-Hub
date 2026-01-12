import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles, Plus, X, Download, Loader2, MessageSquareText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Recording {
  id: string;
  name: string;
  notes: string | null;
  summary: string | null;
  key_points: string[];
  transcript?: string | null;
}

interface RecordingNotesProps {
  recording: Recording;
  onSave: (notes: string, summary: string, keyPoints: string[]) => void;
}

export default function RecordingNotes({ recording, onSave }: RecordingNotesProps) {
  const [notes, setNotes] = useState(recording.notes || '');
  const [summary, setSummary] = useState(recording.summary || '');
  const [keyPoints, setKeyPoints] = useState<string[]>(recording.key_points || []);
  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setNotes(recording.notes || '');
    setSummary(recording.summary || '');
    setKeyPoints(recording.key_points || []);
    setHasChanges(false);
  }, [recording]);

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

  const generateAISummary = async () => {
    if (!notes.trim()) {
      toast.error('Please add some notes first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Based on these lecture notes, please provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points/takeaways

Notes:
${notes}

Format your response as:
SUMMARY:
[Your summary here]

KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]`
            }
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) content += text;
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

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
    }
  };

  const exportNotes = () => {
    const content = `# ${recording.name}

## Summary
${summary || 'No summary yet'}

## Key Points
${keyPoints.length > 0 ? keyPoints.map(p => `- ${p}`).join('\n') : 'No key points yet'}

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

  return (
    <div className="space-y-6">
      {/* Transcript Section */}
      {recording.transcript && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquareText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Auto-Transcription</h3>
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
              <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                {recording.transcript}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notes">Full Notes</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="keypoints">Key Points</TabsTrigger>
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
                    disabled={isGenerating || !notes.trim()}
                  >
                    {isGenerating ? (
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
                  disabled={isGenerating || !notes.trim()}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeKeyPoint(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))
                )}
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