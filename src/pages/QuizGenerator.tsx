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

// Strip markdown code fences before parsing JSON
function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

// Normalize correctAnswer to always be a string for comparison
// The AI may return a number index (0-3) or a string like "A", "True", or the full option text
function resolveCorrectAnswer(correctAnswer: string | number, options?: string[]): string {
  if (typeof correctAnswer === 'number') {
    // It's an index — return the corresponding option text
    if (options && options[correctAnswer] !== undefined) {
      return String(options[correctAnswer]);
    }
    return String(correctAnswer);
  }
  // It's already a string
  return String(correctAnswer);
}

// Compare user answer to correct answer safely (case-insensitive, trimmed)
function isCorrect(userAnswer: string | undefined, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: string; // always stored as string after normalization
  explanation?: string;
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

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

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
    } catch {
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
          topic: uploadedFile?.content
            ? `Topic: ${topic.trim()}\n\nContent from file: ${uploadedFile.content}`
            : topic.trim(),
          questionCount,
          difficulty: 'medium',
        },
      });

      if (error) throw error;

      const reply = data?.result;
      if (!reply) throw new Error('No response from AI');

      const cleaned = cleanJsonResponse(reply);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid quiz format received');
      }

      // Normalize each question — convert correctAnswer to string using resolveCorrectAnswer
      const questionsWithIds: Question[] = parsed.map((q: any) => {
        const options: string[] = Array.isArray(q.options) ? q.options : [];
        const correctAnswer = resolveCorrectAnswer(q.correctAnswer, options);

        // Infer type if not provided
        let type: Question['type'] = 'multiple-choice';
        if (q.type === 'true-false' || options.length === 2) {
          type = 'true-false';
        } else if (q.type === 'fill-blank' || options.length === 0) {
          type = 'fill-blank';
        }

        return {
          id: generateId(),
          type,
          question: q.question || '',
          options: options.length > 0 ? options : undefined,
          correctAnswer,
          explanation: q.explanation || '',
        };
      });

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
    setQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, userAnswer: answer } : q))
    );
  };

  const submitQuiz = () => {
    const unanswered = questions.filter(q => !q.userAnswer);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }
    setShowResults(true);
  };

  const score = questions.filter(q => isCorrect(q.userAnswer, q.correctAnswer)).length;

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
              <Label htmlFor="quiz-topic">Topic or Subject (optional if uploading a file)</Label>
              <Textarea
                id="quiz-topic"
                value={topic}
                onChange={e => setTopic(e.target.value)}
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
                  aria-label="Upload study material"
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="flex-1 truncate text-sm">{uploadedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUploadedFile(null)}
                      aria-label="Remove uploaded file"
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
              <Label htmlFor="question-count">Number of Questions</Label>
              <Input
                id="question-count"
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value) || 5)}
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
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald-500/5">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Score: {score}/{questions.length}
                </h2>
                <p className="text-muted-foreground">
                  {Math.round((score / questions.length) * 100)}%
                </p>
                <Button onClick={resetQuiz} className="mt-4 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  New Quiz
                </Button>
              </div>
            </Card>
          )}

          {questions.map((q, i) => {
            const answered = isCorrect(q.userAnswer, q.correctAnswer);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="font-medium flex-1">{formatAIResponse(q.question)}</p>
                    {showResults && (
                      answered
                        ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {(q.type === 'multiple-choice' || q.type === 'true-false') && (
                    <RadioGroup
                      value={q.userAnswer}
                      onValueChange={v => handleAnswer(q.id, v)}
                      disabled={showResults}
                    >
                      {(q.type === 'true-false' && (!q.options || q.options.length === 0)
                        ? ['True', 'False']
                        : q.options ?? []
                      ).map(opt => {
                        const isCorrectOpt =
                          showResults &&
                          opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                        return (
                          <div
                            key={opt}
                            className={`flex items-center space-x-2 p-2 rounded transition-colors ${isCorrectOpt ? 'bg-green-50 border border-green-200' : ''
                              }`}
                          >
                            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                            <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">
                              {formatAIResponse(opt)}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {q.type === 'fill-blank' && (
                    <Input
                      value={q.userAnswer || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                      placeholder="Your answer..."
                      disabled={showResults}
                      aria-label="Your answer"
                      className={
                        showResults && !isCorrect(q.userAnswer, q.correctAnswer)
                          ? 'border-red-400'
                          : ''
                      }
                    />
                  )}

                  {showResults && !isCorrect(q.userAnswer, q.correctAnswer) && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ Correct answer: {formatAIResponse(q.correctAnswer)}
                    </p>
                  )}

                  {showResults && q.explanation && (
                    <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                      💡 {formatAIResponse(q.explanation)}
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}

          {!showResults && (
            <Button onClick={submitQuiz} className="w-full">
              Submit Quiz
            </Button>
          )}
        </div>
      )}
    </div>
  );
}