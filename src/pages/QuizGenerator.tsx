import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2, CheckCircle, XCircle, RotateCcw, Upload, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { generateId } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { formatAIResponse } from '@/lib/utils';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
}

export default function QuizGenerator() {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Please upload PDF, Word, or text files');
      return;
    }

    try {
      let content = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
      } else {
        content = `[Content from uploaded file: ${file.name}]`;
        toast.info('Note: Full document analysis works best with text files');
      }

      setUploadedFile({ name: file.name, content });
      toast.success(`File "${file.name}" uploaded`);
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim() && !uploadedFile) {
      toast.error('Please enter a topic or upload a file');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          topic: topic.trim(),
          questionCount,
          fileContent: uploadedFile?.content,
        },
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('402')) {
          toast.error('Please add credits to your workspace.');
        } else {
          toast.error(data.error);
        }
        return;
      }
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid quiz format received');
      }

      // Add IDs to questions
      const questionsWithIds: Question[] = data.questions.map((q: any) => ({
        ...q,
        id: generateId(),
      }));

      setQuestions(questionsWithIds);
      setUploadedFile(null);
      toast.success('Quiz generated successfully!');
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, userAnswer: answer } : q));
  };

  const submitQuiz = () => {
    const unanswered = questions.filter(q => !q.userAnswer);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }
    setShowResults(true);
  };

  const score = questions.filter(q => q.userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase()).length;

  const resetQuiz = () => {
    setQuestions([]);
    setShowResults(false);
    setTopic('');
    setUploadedFile(null);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Quiz Architect</h1>
        </div>
        <p className="text-muted-foreground">Generate AI-powered practice tests on any topic</p>
      </div>

      {questions.length === 0 ? (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label>Topic or Subject (optional if uploading a file)</Label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g., Photosynthesis, Quadratic Equations, World War II)"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Upload Study Material (optional)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="flex-1 truncate">{uploadedFile.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setUploadedFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF, Word, or Text File
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload notes, textbooks, or study materials to generate questions from them
              </p>
            </div>

            <div>
              <Label>Number of Questions</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                className="mt-2 w-32"
              />
            </div>

            <Button 
              onClick={generateQuiz} 
              disabled={isGenerating || (!topic.trim() && !uploadedFile)} 
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                'Generate Quiz'
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {showResults && (
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald/5">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Score: {score}/{questions.length}</h2>
                <p className="text-muted-foreground">{Math.round((score / questions.length) * 100)}%</p>
                <Button onClick={resetQuiz} className="mt-4 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  New Quiz
                </Button>
              </div>
            </Card>
          )}

          {questions.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <p className="font-medium flex-1">{formatAIResponse(q.question)}</p>
                  {showResults && (
                    q.userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase() 
                      ? <CheckCircle className="w-5 h-5 text-emerald" />
                      : <XCircle className="w-5 h-5 text-ruby" />
                  )}
                </div>

                {q.type === 'multiple-choice' && (
                  <RadioGroup value={q.userAnswer} onValueChange={(v) => handleAnswer(q.id, v)} disabled={showResults}>
                    {q.options?.map((opt) => (
                      <div key={opt} className={`flex items-center space-x-2 p-2 rounded ${showResults && opt === q.correctAnswer ? 'bg-emerald/10' : ''}`}>
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                        <Label htmlFor={`${q.id}-${opt}`}>{formatAIResponse(opt)}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === 'true-false' && (
                  <RadioGroup value={q.userAnswer} onValueChange={(v) => handleAnswer(q.id, v)} disabled={showResults}>
                    {['True', 'False'].map((opt) => (
                      <div key={opt} className={`flex items-center space-x-2 p-2 rounded ${showResults && opt === q.correctAnswer ? 'bg-emerald/10' : ''}`}>
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                        <Label htmlFor={`${q.id}-${opt}`}>{formatAIResponse(opt)}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === 'fill-blank' && (
                  <Input
                    value={q.userAnswer || ''}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    placeholder="Your answer..."
                    disabled={showResults}
                    className={showResults && q.userAnswer?.toLowerCase() !== q.correctAnswer.toLowerCase() ? 'border-ruby' : ''}
                  />
                )}

                {showResults && q.userAnswer?.toLowerCase() !== q.correctAnswer.toLowerCase() && (
                  <p className="text-sm text-emerald mt-2">Correct: {formatAIResponse(q.correctAnswer)}</p>
                )}
              </Card>
            </motion.div>
          ))}

          {!showResults && (
            <Button onClick={submitQuiz} className="w-full">Submit Quiz</Button>
          )}
        </div>
      )}
    </div>
  );
}
