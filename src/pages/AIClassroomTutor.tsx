import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Download, 
  BookOpen,
  Send,
  Loader2,
  GraduationCap,
  ChevronLeft,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeacherAvatar } from '@/components/classroom/TeacherAvatar';
import { Whiteboard } from '@/components/classroom/Whiteboard';
import { CourseSelector, getCourseById, defaultCourses, Course } from '@/components/classroom/CourseSelector';
import { VoiceControls } from '@/components/classroom/VoiceControls';
import { CustomCourseUpload } from '@/components/classroom/CustomCourseUpload';
import { LessonQuiz } from '@/components/classroom/LessonQuiz';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatAIResponse } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  quiz?: {
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;
  };
}

interface CustomCourseData {
  name: string;
  description: string;
  files: Array<{ name: string; size: number; type: string; content?: string }>;
  topics: string[];
}

const AIClassroomTutor = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showCustomUpload, setShowCustomUpload] = useState(false);
  const [customCourses, setCustomCourses] = useState<Course[]>([]);
  const [customCourseData, setCustomCourseData] = useState<CustomCourseData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [whiteboardContent, setWhiteboardContent] = useState<string[]>([]);
  const [isWritingOnBoard, setIsWritingOnBoard] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState<string | null>(null);
  const [teacherMood, setTeacherMood] = useState<'neutral' | 'happy' | 'thinking'>('neutral');
  const [messageCount, setMessageCount] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Message['quiz'] | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const course = selectedCourse ? getCourseById(selectedCourse, customCourses) : null;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop speaking when user starts typing/speaking
  useEffect(() => {
    if (inputValue) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [inputValue]);

  const getSystemPrompt = useCallback(() => {
    let courseContext = course 
      ? `You are Professor Ada, an expert ${course.name} tutor specializing in ${course.description}.`
      : 'You are Professor Ada, a knowledgeable tutor.';

    if (customCourseData) {
      courseContext += `\n\nThis is a custom course created by the student. Topics to cover: ${customCourseData.topics.join(', ')}.`;
      if (customCourseData.files.some(f => f.content)) {
        courseContext += '\n\nReference materials provided by student:\n';
        customCourseData.files.forEach(f => {
          if (f.content) {
            courseContext += `\n--- ${f.name} ---\n${f.content.slice(0, 5000)}\n`;
          }
        });
      }
    }

    return `${courseContext}

Your teaching style:
- Start by greeting the student warmly and introducing the topic
- Break down complex concepts into digestible parts
- Use the whiteboard to illustrate key points (format with ## for headers, • for bullet points)
- Ask follow-up questions to check understanding
- Provide encouragement and positive reinforcement
- Use real-world examples relevant to the subject

When explaining on the whiteboard:
- Use "## Topic" for main headers
- Use "• point" for bullet points  
- Use "equation = result" for formulas/equations
- Keep explanations clear and structured

After every 3-4 exchanges, consider asking a comprehension question.
Keep responses concise but educational. You are patient, encouraging, and passionate about teaching.`;
  }, [course, customCourseData]);

  const generateQuiz = useCallback(async () => {
    if (messages.length < 2) return null;

    try {
      const response = await supabase.functions.invoke('ai-classroom-tutor', {
        body: {
          messages: [{ role: 'user', content: 'Generate a quick 3-question quiz based on what we just discussed.' }],
          systemPrompt: `Based on this conversation, generate exactly 3 multiple choice questions to test understanding.
          
Previous conversation:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

Return ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`,
          course: selectedCourse,
          generateQuiz: true,
        },
      });

      if (response.error) throw response.error;

      const content = response.data?.content || '';
      try {
        const quizData = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
        return quizData;
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      return null;
    }
  }, [messages, selectedCourse]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    // Stop any ongoing speech
    speechSynthesis.cancel();
    setIsSpeaking(false);

    const newUserMessage: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setTeacherMood('thinking');

    try {
      const response = await supabase.functions.invoke('ai-classroom-tutor', {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: getSystemPrompt(),
          course: selectedCourse,
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || response.data?.message || 'I apologize, I had trouble processing that. Could you please rephrase?';
      
      const assistantMessage: Message = { role: 'assistant', content: assistantContent };
      setMessages([...updatedMessages, assistantMessage]);
      setMessageCount(prev => prev + 1);

      // Parse content for whiteboard
      const lines = assistantContent.split('\n').filter((line: string) => 
        line && (line.startsWith('##') || line.startsWith('•') || line.startsWith('-') || line.includes('='))
      );
      
      if (lines.length > 0) {
        setIsWritingOnBoard(true);
        setWhiteboardContent(lines);
        setTimeout(() => setIsWritingOnBoard(false), lines.length * 400 + 500);
      }

      // Speak the response (cleaned)
      const cleanedText = assistantContent
        .replace(/[#•\-=*]/g, '')
        .replace(/\n+/g, ' ')
        .slice(0, 400);
      setTextToSpeak(cleanedText);
      setTeacherMood('happy');

      // Trigger quiz every 4 messages
      if (messageCount > 0 && (messageCount + 1) % 4 === 0) {
        const quizData = await generateQuiz();
        if (quizData?.questions?.length) {
          setCurrentQuiz(quizData);
          setTimeout(() => setShowQuiz(true), 2000);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response from tutor');
      setTeacherMood('neutral');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, getSystemPrompt, selectedCourse, messageCount, generateQuiz]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setInputValue(transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const handleCreateCustomCourse = useCallback((data: CustomCourseData) => {
    const newCourse: Course = {
      id: `custom-${Date.now()}`,
      name: data.name,
      description: data.description || data.topics.join(', '),
      icon: <Sparkles className="h-6 w-6" />,
      color: 'from-primary to-emerald',
      isCustom: true,
    };
    setCustomCourses(prev => [...prev, newCourse]);
    setCustomCourseData(data);
    setSelectedCourse(newCourse.id);
    setShowCustomUpload(false);
    toast.success(`Course "${data.name}" created!`);
  }, []);

  const exportLesson = useCallback(() => {
    const lessonContent = messages.map(m => 
      `${m.role === 'user' ? 'Student' : 'Professor Ada'}: ${m.content}`
    ).join('\n\n---\n\n');

    const blob = new Blob([
      `# ${course?.name || 'Lesson'} - AI Classroom Session\n\n`,
      `Date: ${new Date().toLocaleDateString()}\n\n`,
      '---\n\n',
      lessonContent,
      '\n\n---\n\n## Whiteboard Notes\n\n',
      whiteboardContent.join('\n'),
    ], { type: 'text/markdown' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson-${course?.id || 'session'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lesson exported successfully!');
  }, [messages, whiteboardContent, course]);

  const handleQuizComplete = useCallback((score: number, total: number) => {
    setShowQuiz(false);
    setCurrentQuiz(null);
    toast.success(`Quiz complete! ${score}/${total} correct`);
    
    // Add feedback message
    const feedback = score === total 
      ? "Excellent work! You've mastered this topic. Let's move on to something new!"
      : score >= total / 2
        ? "Good job! You're getting the hang of it. Let me clarify the points you missed."
        : "Let's review this topic together. Don't worry, understanding takes practice!";
    
    setMessages(prev => [...prev, { role: 'assistant', content: feedback }]);
    setTextToSpeak(feedback);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Course selection screen
  if (!selectedCourse && !showCustomUpload) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-emerald text-white shadow-lg">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                AI Classroom Tutor
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a subject or create a custom course to begin your personalized 
              learning session with Professor Ada.
            </p>
          </motion.div>

          <CourseSelector 
            selectedCourse={selectedCourse} 
            onSelectCourse={setSelectedCourse}
            onCreateCustom={() => setShowCustomUpload(true)}
            customCourses={customCourses}
          />
        </div>
      </div>
    );
  }

  // Custom course upload screen
  if (showCustomUpload) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto pt-8">
          <CustomCourseUpload
            onCreateCourse={handleCreateCustomCourse}
            onCancel={() => setShowCustomUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSelectedCourse(null);
                setMessages([]);
                setWhiteboardContent([]);
                setMessageCount(0);
                setCustomCourseData(null);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${course?.color} text-white shadow-sm`}>
                {course?.icon}
              </div>
              <div>
                <h1 className="font-semibold text-foreground">{course?.name} Classroom</h1>
                <p className="text-xs text-muted-foreground">with Professor Ada</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <VoiceControls
              onTranscript={handleVoiceTranscript}
              textToSpeak={textToSpeak}
              onSpeakingChange={setIsSpeaking}
            />
            <Button variant="outline" size="sm" onClick={exportLesson}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - Split screen */}
      <div className="max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-70px)]">
        {/* Left side - Teacher & Chat */}
        <div className="flex flex-col gap-4">
          {/* Avatar section */}
          <div className="bg-card rounded-xl border border-border h-56 lg:h-64 overflow-hidden">
            <TeacherAvatar isSpeaking={isSpeaking} mood={teacherMood} isActive={true} />
          </div>

          {/* Chat section */}
          <div className="flex-1 bg-card rounded-xl border border-border flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm text-foreground">Conversation</span>
              </div>
              {messageCount > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const quizData = await generateQuiz();
                    if (quizData?.questions?.length) {
                      setCurrentQuiz(quizData);
                      setShowQuiz(true);
                    } else {
                      toast.error('Could not generate quiz');
                    }
                  }}
                  className="text-xs"
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Take Quiz
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-muted-foreground py-8"
                  >
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Ask Professor Ada anything about {course?.name}!</p>
                    <p className="text-sm mt-1">Try: "Explain the basics" or use your voice</p>
                  </motion.div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.role === 'assistant' ? formatAIResponse(message.content) : message.content}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Professor Ada is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Whiteboard or Quiz */}
        <div className="h-full">
          <AnimatePresence mode="wait">
            {showQuiz && currentQuiz ? (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex items-center justify-center p-4"
              >
                <div className="w-full max-w-lg">
                  <LessonQuiz
                    questions={currentQuiz.questions}
                    onComplete={handleQuizComplete}
                    onSkip={() => {
                      setShowQuiz(false);
                      setCurrentQuiz(null);
                    }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="whiteboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <Whiteboard
                  content={whiteboardContent}
                  isDrawing={isWritingOnBoard}
                  onClear={() => setWhiteboardContent([])}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AIClassroomTutor;
