import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, SkipForward, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import * as gradesSyncService from '@/services/gradesSyncService';
import { toast } from 'sonner';

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

const GRADE_LEVELS = [
  'Middle School',
  '9th',
  '10th',
  '11th',
  '12th',
  'College Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate School'
];

const COLOR_SWATCHES = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ef4444', // Red
];

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const navigate = useNavigate();
  const { setSelectedYear, setSelectedSemester, addAcademicYear, addSemester, addSubject, academicYears } = useStore();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Welcome
  const [name, setName] = useState('');
  
  // Step 2: School Info
  const [gradeLevel, setGradeLevel] = useState('');
  const [school, setSchool] = useState('');
  
  // Step 3: First Subject
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const [subjectCreated, setSubjectCreated] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const handleNext = async () => {
    setError('');
    
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      setLoading(true);
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: name,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error saving name:', err);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setLoading(true);
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          grade_level: gradeLevel,
          school: school,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error saving school info:', err);
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      if (!subjectName.trim()) {
        handleSkip();
        return;
      }
      
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const yearId = crypto.randomUUID();
        const semesterId = crypto.randomUUID();
        const subjectId = crypto.randomUUID();
        
        // Save academic year
        await gradesSyncService.saveAcademicYear(userId, {
          id: yearId,
          name: `${currentYear}-${currentYear + 1} School Year`,
          user_id: userId,
          semesters: []
        });
        
        // Save semester
        await gradesSyncService.saveSemester(userId, {
          id: semesterId,
          name: 'Fall Semester',
          academic_year_id: yearId,
          user_id: userId,
          subjects: []
        });
        
        // Save subject
        await gradesSyncService.saveSubject(userId, {
          id: subjectId,
          name: subjectName,
          teacher: teacherName,
          color: selectedColor,
          semester_id: semesterId,
          user_id: userId,
          categories: []
        });
        
        // Update Zustand store
        addAcademicYear(`${currentYear}-${currentYear + 1} School Year`);
        const year = useStore.getState().academicYears.find(y => y.name === `${currentYear}-${currentYear + 1} School Year`);
        if (year) {
          setSelectedYear(year.id);
          addSemester(year.id, 'Fall Semester');
          const sem = useStore.getState().academicYears.find(y => y.id === year.id)?.semesters[0];
          if (sem) {
            setSelectedSemester(sem.id);
            addSubject(year.id, sem.id, subjectName, selectedColor);
          }
        }
        
        // Show success message
        setSubjectCreated(true);
        toast.success('Subject added!');
        
        // Wait 1.5s then advance
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error('Error creating subject:', err);
      } finally {
        setLoading(false);
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSkip = async () => {
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
    onComplete();
  };

  const handleFinish = async () => {
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="fixed inset-0 pointer-events-none"
        onClick={() => {}}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Progress indicator */}
        <div className="absolute top-4 right-4 text-sm text-muted-foreground">
          Step {step} of 4
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6 pb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s < step ? 'bg-primary' : s === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="text-center mb-8">
                {/* APEX Logomark */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-4xl">A</span>
                </div>
                <h2 id="onboarding-title" className="text-2xl font-bold mb-2">
                  Welcome to APEX AI Study Hub 👋
                </h2>
                <p className="text-muted-foreground">
                  Let's set up your account in 60 seconds
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name or nickname</Label>
                  <Input
                    ref={inputRef}
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              
              <div className="flex justify-between mt-8">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
                <Button onClick={handleNext} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: School Info */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="text-center mb-8">
                <h2 id="onboarding-title" className="text-2xl font-bold mb-2">
                  Tell us about your studies
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Grade Level</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School Name</Label>
                  <Input
                    id="school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. OU, OSU (optional)"
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: First Subject */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="text-center mb-8">
                <h2 id="onboarding-title" className="text-2xl font-bold mb-2">
                  Add your first class
                </h2>
                <p className="text-muted-foreground">
                  You can add more later in Grades
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. AP Chemistry"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherName">Teacher Name (optional)</Label>
                  <Input
                    id="teacherName"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g. Mr. Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          selectedColor === color 
                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      >
                        {selectedColor === color && (
                          <Check className="w-5 h-5 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {subjectCreated && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-green-500"
                  >
                    <Check className="w-5 h-5" />
                    <span>✓ Subject added!</span>
                  </motion.div>
                )}
              </div>
              
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
                <Button onClick={handleNext} disabled={loading || !subjectName.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Feature Tour */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="text-center mb-6">
                <h2 id="onboarding-title" className="text-2xl font-bold mb-2">
                  You're all set!
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { emoji: '📊', name: 'Grade Tracking', desc: 'Track assignments and see your GPA live' },
                  { emoji: '🤖', name: 'AI Notes', desc: 'Let AI enhance and organize your notes' },
                  { emoji: '🃏', name: 'Flashcards', desc: 'Generate flashcards from any topic' },
                  { emoji: '📝', name: 'Quiz Generator', desc: 'Test yourself with AI-generated quizzes' },
                  { emoji: '⏱️', name: 'Pomodoro', desc: 'Stay focused with timed study sessions' },
                  { emoji: '🔍', name: 'AI Detector', desc: 'Check if text was written by AI' },
                ].map((feature) => (
                  <div 
                    key={feature.name}
                    className="p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="text-2xl mb-1">{feature.emoji}</div>
                    <div className="font-medium text-sm">{feature.name}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleFinish} className="w-full ml-4">
                  Start Studying →
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default OnboardingModal;
