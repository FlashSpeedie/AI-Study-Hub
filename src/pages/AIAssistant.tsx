import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Upload, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export default function AIAssistant() {
  const { chatMessages, addChatMessage, clearChat } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    addChatMessage({ role: 'user', content: input });
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call when backend is connected)
    setTimeout(() => {
      addChatMessage({
        role: 'assistant',
        content: `I understand you're asking about: "${input}". As your AI Scholar Assistant, I'm here to help with your studies. To enable full AI capabilities, please connect to Lovable Cloud for backend functionality.`,
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">AI Scholar Assistant</h1>
        </div>
        <p className="text-muted-foreground">Your intelligent study companion</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
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
            chatMessages.map((msg) => (
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
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => toast.info('File upload requires backend connection')}>
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
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            {chatMessages.length > 0 && (
              <Button variant="outline" size="icon" onClick={clearChat}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
