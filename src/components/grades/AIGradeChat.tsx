import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import * as gradesSyncService from '@/services/gradesSyncService';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

interface GradeData {
  academicYear: string;
  semester: string;
  subject: string;
  assignments: {
    name: string;
    earnedPoints: number;
    totalPoints: number;
    category?: string;
  }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIGradeChatProps {
  onClose: () => void;
  academicYears: { id: string; name: string }[];
}

export default function AIGradeChat({ onClose, academicYears }: AIGradeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I can help you add grades using AI. Just describe your grades in natural language, like:

• "Add Math 101 for Fall 2025: Homework 1 got 85/100, Quiz 1 got 18/20, and Test 1 got 78/100"

• "For Chemistry 201 Spring 2026: Labs are 30%, Tests are 40%, Homework is 30%. Lab 1: 95/100, Lab 2: 88/100, Test 1: 82/100"

You can also upload a photo of a grade sheet and I'll extract the data for you!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<GradeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { addAcademicYear, addSemester, addSubject, addCategory, addAssignment } = useStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseGradeData = (text: string): GradeData | null => {
    const match = text.match(/<GRADE_DATA>([\s\S]*?)<\/GRADE_DATA>/);
    if (!match) return null;

    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr);
      
      return {
        academicYear: parsed.academicYear || parsed.academic_year || '',
        semester: parsed.semester || '',
        subject: parsed.subject || '',
        assignments: (parsed.assignments || []).map((a: any) => ({
          name: a.name || a.assignment || '',
          earnedPoints: Number(a.earnedPoints || a.earned_points || a.earned || 0),
          totalPoints: Number(a.totalPoints || a.total_points || a.total || 100),
          category: a.category || 'Assignments',
        })),
      };
    } catch (e) {
      console.error('Failed to parse grade data:', e);
      return null;
    }
  };

  const getMessageWithoutGradeData = (text: string): string => {
    return text.replace(/<GRADE_DATA>[\s\S]*?<\/GRADE_DATA>/g, '').trim();
  };

  const sendMessage = async (message: string, imageBase64?: string, mimeType?: string) => {
    if (!message.trim() && !imageBase64) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    if (imageBase64) {
      userMessage.content = message || 'Please analyze this grade sheet';
    }
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        imageBase64
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-grade-image`
          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(
            imageBase64
              ? { imageBase64, mimeType }
              : { message, context: 'gradeEntry' }
          ),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get response');
      }

      const data = await response.json();
      const responseText = data.response || data.message || '';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText },
      ]);

      const gradeData = parseGradeData(responseText);
      if (gradeData) {
        setPreviewData(gradeData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setUploadedImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      const mime = file.type || 'image/png';

      setUploadedImage(result);
      setIsAnalyzingImage(true);
      
      await sendMessage('Please analyze this grade sheet image', base64, mime);
      setIsAnalyzingImage(false);
    };
    reader.readAsDataURL(file);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleConfirmGrades = async (gradeData: GradeData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    setIsSaving(true);

    try {
      let yearId: string;
      const existingYear = academicYears.find(
        (y) => y.name.toLowerCase() === gradeData.academicYear.toLowerCase()
      );

      if (existingYear) {
        yearId = existingYear.id;
      } else {
        yearId = crypto.randomUUID();
        await gradesSyncService.saveAcademicYear(userId, {
          id: yearId,
          name: gradeData.academicYear,
        });
        addAcademicYear(gradeData.academicYear);
      }

      const storeYears = useStore.getState().academicYears;
      const year = storeYears.find((y) => y.id === yearId);

      let semesterId: string;
      const existingSemester = year?.semesters.find(
        (s) => s.name.toLowerCase() === gradeData.semester.toLowerCase()
      );

      if (existingSemester) {
        semesterId = existingSemester.id;
      } else {
        semesterId = crypto.randomUUID();
        await gradesSyncService.saveSemester(userId, {
          id: semesterId,
          academic_year_id: yearId,
          name: gradeData.semester,
        });
        addSemester(yearId, gradeData.semester);
      }

      const storeYearsAfterSem = useStore.getState().academicYears;
      const yearAfterSem = storeYearsAfterSem.find((y) => y.id === yearId);
      const semester = yearAfterSem?.semesters.find(
        (s) => s.name.toLowerCase() === gradeData.semester.toLowerCase()
      );

      let subjectId: string;
      const existingSubject = semester?.subjects.find(
        (sub) => sub.name.toLowerCase() === gradeData.subject.toLowerCase()
      );

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        subjectId = crypto.randomUUID();
        await gradesSyncService.saveSubject(userId, {
          id: subjectId,
          semester_id: semesterId,
          name: gradeData.subject,
          teacher: '',
          color: '#6366f1',
        });
        addSubject(yearId, semesterId, gradeData.subject);
      }

      const storeYearsAfterSub = useStore.getState().academicYears;
      const yearAfterSub = storeYearsAfterSub.find((y) => y.id === yearId);
      const semAfterSub = yearAfterSub?.semesters.find((s) => s.id === semesterId);
      const subject = semAfterSub?.subjects.find((sub) => sub.id === subjectId);

      const categoryName = 'Assignments';
      let categoryId: string;
      const existingCategory = subject?.categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        categoryId = crypto.randomUUID();
        await gradesSyncService.saveCategory(userId, {
          id: categoryId,
          subject_id: subjectId,
          name: categoryName,
          weight: 100,
        });
        addCategory(yearId, semesterId, subjectId, categoryName, 100);
      }

      for (const assignment of gradeData.assignments) {
        const assignmentId = crypto.randomUUID();
        await gradesSyncService.saveAssignment(userId, {
          id: assignmentId,
          category_id: categoryId,
          name: assignment.name,
          earnedPoints: assignment.earnedPoints,
          totalPoints: assignment.totalPoints,
        });
        addAssignment(
          yearId,
          semesterId,
          subjectId,
          categoryId,
          assignment.name,
          assignment.earnedPoints,
          assignment.totalPoints
        );
      }

      const result = await gradesSyncService.syncGradesToSupabase(userId, []);
      if (result.data) {
        useStore.setState({ academicYears: result.data });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Done! I've saved ${gradeData.assignments.length} assignment(s) to your grades. You can see them in the Grades page now!`,
        },
      ]);

      setPreviewData(null);
      toast.success('Grades saved successfully!');
    } catch (err: any) {
      console.error('Failed to save grades:', err);
      toast.error('Failed to save grades: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Add Grades with AI</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.role === 'assistant'
                    ? getMessageWithoutGradeData(message.content)
                    : message.content}
                </p>
              </div>
            </motion.div>
          ))}
          
          {uploadedImage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg overflow-hidden border">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded grade sheet" 
                  className="w-48 h-auto"
                />
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {previewData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t p-4 bg-primary/5"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                Preview — Review before saving
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{previewData.academicYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semester:</span>
                  <span className="font-medium">{previewData.semester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium">{previewData.subject}</span>
                </div>
                {previewData.assignments.map((a, i) => (
                  <div key={i} className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assignment:</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grade:</span>
                      <span className="font-bold text-primary">
                        {a.earnedPoints}/{a.totalPoints} ({Math.round((a.earnedPoints / a.totalPoints) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPreviewData(null)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleConfirmGrades(previewData)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Save Grades
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            aria-label="Upload grade sheet image"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Upload image of grade sheet"
            className="flex-shrink-0"
            disabled={isLoading || isAnalyzingImage}
          >
            {isAnalyzingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your grades..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
