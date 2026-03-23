import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  ChevronDown,
  BookOpen,
  ArrowLeft,
  Pencil,
  Trash2,
  ChevronUp,
  ExternalLink,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import * as gradesSyncService from '@/services/gradesSyncService';
import {
  calculateSubjectGrade,
  calculateCategoryAverage,
  getLetterGrade,
  getGradeColor,
  getGradeColorHex,
  getTotalCategoryWeight,
  percentageToGPA
} from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AcademicYear } from '@/types';

export default function Grades() {
  const {
    academicYears,
    selectedYearId,
    selectedSemesterId,
    selectedSubjectId,
    setSelectedYear,
    setSelectedSemester,
    setSelectedSubject,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    addSemester,
    updateSemester,
    deleteSemester,
    addSubject,
    updateSubject,
    deleteSubject,
    addCategory,
    updateCategory,
    deleteCategory,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    gradesSyncStatus,
    gradesSyncError,
    lastSyncedAt,
    setGradesSyncStatus,
    setGradesSyncError,
    setLastSyncedAt,
  } = useStore();

  // Dialog states
  const [yearDialog, setYearDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [semesterDialog, setSemesterDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [subjectDialog, setSubjectDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; edit?: string; name: string; weight: string }>({ open: false, name: '', weight: '' });
  const [assignmentDialog, setAssignmentDialog] = useState<{ open: boolean; categoryId: string; edit?: string; name: string; earned: string; total: string }>({ open: false, categoryId: '', name: '', earned: '', total: '' });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // PDF Parsing state
  const [isPdfParsing, setIsPdfParsing] = useState(false);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [parsedCategories, setParsedCategories] = useState<{ name: string; weight: number }[] | null>(null);
  const [parsedSubjectName, setParsedSubjectName] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }
  }, []);

  // Sync grades on mount
  useEffect(() => {
    const syncGrades = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setGradesSyncStatus('syncing');
      const result = await gradesSyncService.syncGradesToSupabase(session.user.id, academicYears);
      
      if (result.error) {
        setGradesSyncStatus('error');
        setGradesSyncError(result.error);
      } else if (result.data) {
        // Update store with synced data
        useStore.setState({ academicYears: result.data });
        setGradesSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString());
      } else {
        setGradesSyncStatus('idle');
      }
    };

    syncGrades();
  }, []);

  // Get current data
  const currentYear = academicYears.find(y => y.id === selectedYearId);
  const currentSemester = currentYear?.semesters.find(s => s.id === selectedSemesterId);
  const currentSubject = currentSemester?.subjects.find(s => s.id === selectedSubjectId);

  // Retry sync handler
  const handleRetrySync = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setGradesSyncStatus('syncing');
    setGradesSyncError(null);
    const result = await gradesSyncService.syncGradesToSupabase(
      session.user.id, 
      academicYears
    );
    if (result.error) {
      setGradesSyncStatus('error');
      setGradesSyncError(result.error);
    } else if (result.data) {
      useStore.setState({ academicYears: result.data });
      setGradesSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  };

  // Calculate weight validation
  const totalWeight = currentSubject ? getTotalCategoryWeight(currentSubject) : 0;
  const weightWarning = currentSubject && currentSubject.categories.length > 0 && totalWeight !== 100;

  // Sync Status Bar UI
  const renderSyncStatusBar = () => {
    if (gradesSyncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600 
          bg-blue-50 dark:bg-blue-950/20 border border-blue-200 
          dark:border-blue-800 rounded-lg px-4 py-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Syncing your grades to cloud...</span>
        </div>
      );
    }
    
    if (gradesSyncStatus === 'synced' && lastSyncedAt) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 
          bg-green-50 dark:bg-green-950/20 border border-green-200 
          dark:border-green-800 rounded-lg px-4 py-2 mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>All grades saved to cloud · Last synced {lastSyncedAt}</span>
        </div>
      );
    }
    
    if (gradesSyncStatus === 'error') {
      return (
        <div className="flex items-center justify-between text-sm text-red-600 
          bg-red-50 dark:bg-red-950/20 border border-red-200 
          dark:border-red-800 rounded-lg px-4 py-2 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {gradesSyncError || 'Could not sync grades — your data is safe locally'}
            </span>
          </div>
          <button
            onClick={handleRetrySync}
            className="text-xs font-medium underline hover:no-underline 
              ml-4 flex-shrink-0"
            aria-label="Retry sync"
          >
            Retry
          </button>
        </div>
      );
    }
    
    return null;
  };

  // Handlers
  const handleSaveYear = () => {
    if (!yearDialog.value.trim()) {
      toast.error('Please enter a year name');
      return;
    }
    if (yearDialog.edit) {
      updateAcademicYear(yearDialog.edit, yearDialog.value);
      toast.success('Year updated');
    } else {
      addAcademicYear(yearDialog.value);
      toast.success('Year added');
    }
    setYearDialog({ open: false, value: '' });
  };

  const handleSaveSemester = () => {
    if (!semesterDialog.value.trim() || !selectedYearId) {
      toast.error('Please enter a semester name');
      return;
    }
    if (semesterDialog.edit) {
      updateSemester(selectedYearId, semesterDialog.edit, semesterDialog.value);
      toast.success('Semester updated');
    } else {
      addSemester(selectedYearId, semesterDialog.value);
      toast.success('Semester added');
    }
    setSemesterDialog({ open: false, value: '' });
  };

  const handleSaveSubject = () => {
    if (!subjectDialog.value.trim() || !selectedYearId || !selectedSemesterId) {
      toast.error('Please enter a subject name');
      return;
    }
    if (subjectDialog.edit) {
      updateSubject(selectedYearId, selectedSemesterId, subjectDialog.edit, subjectDialog.value);
      toast.success('Subject updated');
    } else {
      addSubject(selectedYearId, selectedSemesterId, subjectDialog.value);
      toast.success('Subject added');
    }
    setSubjectDialog({ open: false, value: '' });
  };

  const handleDeleteSubject = (id: string) => {
    if (!selectedYearId || !selectedSemesterId) return;
    deleteSubject(selectedYearId, selectedSemesterId, id);
    toast.success('Subject deleted');
  };

  const handleSaveCategory = () => {
    if (!categoryDialog.name.trim() || !categoryDialog.weight || !selectedYearId || !selectedSemesterId || !selectedSubjectId) {
      toast.error('Please fill in all fields');
      return;
    }
    const weight = parseFloat(categoryDialog.weight);
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      toast.error('Please enter a valid weight (1-100)');
      return;
    }
    
    // Check if adding this category would exceed 100%
    const currentWeight = categoryDialog.edit 
      ? totalWeight - (currentSubject?.categories.find(c => c.id === categoryDialog.edit)?.weight || 0)
      : totalWeight;
    
    if (currentWeight + weight > 100) {
      toast.error(`Cannot add ${weight}%. Current total is ${currentWeight}%. Maximum remaining is ${100 - currentWeight}%`);
      return;
    }
    
    if (categoryDialog.edit) {
      updateCategory(selectedYearId, selectedSemesterId, selectedSubjectId, categoryDialog.edit, categoryDialog.name, weight);
      toast.success('Category updated');
    } else {
      addCategory(selectedYearId, selectedSemesterId, selectedSubjectId, categoryDialog.name, weight);
      toast.success('Category added');
    }
    setCategoryDialog({ open: false, name: '', weight: '' });
  };

  const handleDeleteCategory = (id: string) => {
    if (!selectedYearId || !selectedSemesterId || !selectedSubjectId) return;
    deleteCategory(selectedYearId, selectedSemesterId, selectedSubjectId, id);
    toast.success('Category deleted');
  };

  const handleSaveAssignment = () => {
    if (!assignmentDialog.name.trim() || !assignmentDialog.earned || !assignmentDialog.total || !selectedYearId || !selectedSemesterId || !selectedSubjectId) {
      toast.error('Please fill in all fields');
      return;
    }
    const earned = parseFloat(assignmentDialog.earned);
    const total = parseFloat(assignmentDialog.total);
    if (isNaN(earned) || isNaN(total) || total <= 0) {
      toast.error('Please enter valid point values');
      return;
    }
    if (assignmentDialog.edit) {
      updateAssignment(selectedYearId, selectedSemesterId, selectedSubjectId, assignmentDialog.categoryId, assignmentDialog.edit, assignmentDialog.name, earned, total);
      toast.success('Assignment updated');
    } else {
      addAssignment(selectedYearId, selectedSemesterId, selectedSubjectId, assignmentDialog.categoryId, assignmentDialog.name, earned, total);
      toast.success('Assignment added');
    }
    setAssignmentDialog({ open: false, categoryId: '', name: '', earned: '', total: '' });
  };

  const handleDeleteAssignment = (categoryId: string, assignmentId: string) => {
    if (!selectedYearId || !selectedSemesterId || !selectedSubjectId) return;
    deleteAssignment(selectedYearId, selectedSemesterId, selectedSubjectId, categoryId, assignmentId);
    toast.success('Assignment deleted');
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Import Functions
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      importGradesFromCSV(csv);
    };
    reader.readAsText(file);
  };

  const importGradesFromCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV file must contain at least a header row and one data row');
      return;
    }

    const expectedHeaders = ['Year', 'Semester', 'Subject', 'Category', 'Category Weight', 'Assignment', 'Earned Points', 'Total Points', 'Percentage'];
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    if (headers.length !== expectedHeaders.length || !expectedHeaders.every((h, i) => h === headers[i])) {
      toast.error(`Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}. Found: ${headers.join(', ')}`);
      return;
    }

    // Parse all rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(field => field.replace(/"/g, '').trim());
      if (row.length !== 9) {
        toast.error(`Row ${i + 1} has invalid number of columns`);
        return;
      }

      const [year, semester, subject, category, categoryWeightStr, assignment, earnedStr, totalStr] = row;
      const categoryWeight = parseFloat(categoryWeightStr);
      const earned = parseFloat(earnedStr);
      const total = parseFloat(totalStr);

      if (isNaN(categoryWeight) || categoryWeight < 0 || categoryWeight > 100) {
        toast.error(`Row ${i + 1} has invalid category weight`);
        return;
      }

      if (isNaN(earned) || isNaN(total) || total <= 0) {
        toast.error(`Row ${i + 1} has invalid point values`);
        return;
      }

      data.push({ year, semester, subject, category, categoryWeight, assignment, earned, total });
    }

    // Create academic structure
    const yearMap = new Map<string, string>();
    const semesterMap = new Map<string, string>();
    const subjectMap = new Map<string, string>();
    const categoryMap = new Map<string, string>();

    // Add years
    const uniqueYears = [...new Set(data.map(d => d.year))];
    uniqueYears.forEach(yearName => {
      let year = academicYears.find(y => y.name === yearName);
      if (!year) {
        addAcademicYear(yearName);
        year = academicYears.find(y => y.name === yearName); // Find again after adding
      }
      if (year) yearMap.set(yearName, year.id);
    });

    // Add semesters
    const uniqueSemesters = [...new Set(data.map(d => `${d.year}|${d.semester}`))];
    uniqueSemesters.forEach(semKey => {
      const [yearName, semName] = semKey.split('|');
      const yearId = yearMap.get(yearName);
      if (!yearId) return;

      const year = academicYears.find(y => y.id === yearId);
      let semester = year?.semesters.find(s => s.name === semName);
      if (!semester) {
        addSemester(yearId, semName);
        semester = academicYears.find(y => y.id === yearId)?.semesters.find(s => s.name === semName);
      }
      if (semester) semesterMap.set(semKey, semester.id);
    });

    // Add subjects
    const uniqueSubjects = [...new Set(data.map(d => `${d.year}|${d.semester}|${d.subject}`))];
    uniqueSubjects.forEach(subjKey => {
      const [yearName, semName, subjName] = subjKey.split('|');
      const semKey = `${yearName}|${semName}`;
      const semesterId = semesterMap.get(semKey);
      if (!semesterId) return;

      const semester = academicYears.find(y => y.id === yearMap.get(yearName))?.semesters.find(s => s.id === semesterId);
      let subject = semester?.subjects.find(s => s.name === subjName);
      if (!subject) {
        addSubject(yearMap.get(yearName)!, semesterId, subjName);
        subject = academicYears.find(y => y.id === yearMap.get(yearName))?.semesters.find(s => s.id === semesterId)?.subjects.find(s => s.name === subjName);
      }
      if (subject) subjectMap.set(subjKey, subject.id);
    });

    // Add categories
    const uniqueCategories = [...new Set(data.map(d => `${d.year}|${d.semester}|${d.subject}|${d.category}`))];
    uniqueCategories.forEach(catKey => {
      const [yearName, semName, subjName, catName] = catKey.split('|');
      const subjKey = `${yearName}|${semName}|${subjName}`;
      const subjectId = subjectMap.get(subjKey);
      if (!subjectId) return;

      const subject = academicYears.find(y => y.id === yearMap.get(yearName))?.semesters.find(s => s.id === semesterMap.get(`${yearName}|${semName}`))?.subjects.find(s => s.id === subjectId);
      let category = subject?.categories.find(c => c.name === catName);
      if (!category) {
        const weight = data.find(d => d.year === yearName && d.semester === semName && d.subject === subjName && d.category === catName)?.categoryWeight || 10;
        addCategory(yearMap.get(yearName)!, semesterMap.get(`${yearName}|${semName}`)!, subjectId, catName, weight);
        category = academicYears.find(y => y.id === yearMap.get(yearName))?.semesters.find(s => s.id === semesterMap.get(`${yearName}|${semName}`))?.subjects.find(s => s.id === subjectId)?.categories.find(c => c.name === catName);
      }
      if (category) categoryMap.set(catKey, category.id);
    });

    // Add assignments
    let importedCount = 0;
    let skippedCount = 0;

    data.forEach(({ year, semester, subject, category, assignment, earned, total }) => {
      const catKey = `${year}|${semester}|${subject}|${category}`;
      const categoryId = categoryMap.get(catKey);
      if (!categoryId) return;

      const cat = academicYears.find(y => y.id === yearMap.get(year))?.semesters.find(s => s.id === semesterMap.get(`${year}|${semester}`))?.subjects.find(s => s.id === subjectMap.get(`${year}|${semester}|${subject}`))?.categories.find(c => c.id === categoryId);
      if (!cat) return;

      const exists = cat.assignments.find(a => a.name === assignment);
      if (exists) {
        skippedCount++;
        return;
      }

      addAssignment(yearMap.get(year)!, semesterMap.get(`${year}|${semester}`)!, subjectMap.get(`${year}|${semester}|${subject}`)!, categoryId, assignment, earned, total);
      importedCount++;
    });

    toast.success(`Imported ${importedCount} assignments${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}`);
  };

  // PDF Syllabus Parsing
  const handlePdfImport = () => {
    pdfInputRef.current?.click();
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    if (!selectedYearId || !selectedSemesterId) {
      toast.error('Please select an academic year and semester first before importing a syllabus');
      return;
    }

    const storedKey = localStorage.getItem('gemini_api_key');
    const apiKey = geminiApiKey || storedKey;
    if (!apiKey && !storedKey) {
      const enteredKey = prompt('Please enter your Gemini API key:\n(You can get one from https://aistudio.google.com/app/apikey)\n\nThis will be saved for future use.');
      if (!enteredKey) {
        toast.error('Gemini API key is required');
        return;
      }
      localStorage.setItem('gemini_api_key', enteredKey);
      setGeminiApiKey(enteredKey);
    }

    setIsPdfParsing(true);
    setPdfParseError(null);
    setParsedCategories(null);
    setParsedSubjectName('');

    try {
      // Read PDF file as base64
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const key = geminiApiKey || localStorage.getItem('gemini_api_key') || '';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

      const systemPrompt = `You are an expert at analyzing course syllabi. Your task is to extract course and grading information from syllabus text.

Extract the following from the syllabus:

1. COURSE/SUBJECT NAME: The name of the course (e.g., "Introduction to Computer Science", "Calculus I", "Physics 101")
2. GRADING CATEGORIES: All grading categories and their weight percentages

Common grading categories include:
- Exams, Tests, Quizzes
- Homework, Assignments
- Projects
- Labs
- Participation
- Final Exam
- Presentations
- Essays/Papers
- Attendance
- Midterm
- Final Project

For each grading category, provide:
1. The category name (standardize common variations)
2. The weight percentage (as a number)

IMPORTANT: 
- Return ONLY a valid JSON object with "subjectName" and "categories" properties
- Do NOT include any other text or explanation
- The category weights should sum to 100% (or close to it)
- If you cannot find exact percentages, estimate based on typical course structures but note it
- Extract EVERY category mentioned, don't skip any
- Look for the course name in the title, header, or first page of the syllabus
- If you cannot find grading information, return an empty categories array and set subjectName to empty string

Example output format:
{"subjectName": "CS 101: Introduction to Programming", "categories": [{"name": "Exams", "weight": 40}, {"name": "Homework", "weight": 30}, {"name": "Projects", "weight": 20}, {"name": "Participation", "weight": 10}]}`;

      const userMessage = `Extract all grading categories and their weight percentages from this course syllabus file: ${file.name}

Please analyze the syllabus content and extract the grading breakdown. Look for sections like:
- Grading
- Evaluation  
- Grading Policy
- Grade Breakdown
- Assessment
- Course Requirements
- Tests and Exams
- Homework
- Projects
- Participation
- Final Exam

Return a JSON object with:
- "subjectName": The course name
- "categories": Array of {name, weight} objects for each grading category

If you cannot find clear grading information, still try to identify any mentioned categories and estimate weights, or return an empty array if absolutely nothing is found.`;

      const geminiRequest = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userMessage }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        
        if (response.status === 401 || errorText.includes('API_KEY_INVALID')) {
          localStorage.removeItem('gemini_api_key');
          setGeminiApiKey('');
          throw new Error('Invalid Gemini API key. Please check your API key and try again.');
        } else if (response.status === 403 || errorText.includes('permission')) {
          throw new Error('Gemini API access denied. Please check your API key permissions.');
        } else if (response.status === 429) {
          throw new Error('Gemini API rate limit exceeded. Please try again later.');
        }
        throw new Error(`Failed to analyze syllabus: ${errorText}`);
      }

      const aiData = await response.json();
      const content = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No content returned from Gemini AI. Please try again.');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('AI returned invalid JSON format. Please try again.');
      }

      const subjectName = parsed.subjectName || parsed.courseName || parsed.course || parsed.name || '';
      let categories: { name: string; weight: number }[] = [];

      if (Array.isArray(parsed)) {
        categories = parsed;
      } else if (parsed.categories) {
        categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      } else if (parsed.grading || parsed.gradeBreakdown || parsed.assessments) {
        categories = parsed.grading || parsed.gradeBreakdown || parsed.assessments;
      }

      categories = categories.filter((cat) => 
        cat.name && typeof cat.weight === 'number' && cat.weight > 0
      );

      if (categories.length === 0) {
        throw new Error('No grading categories found in the syllabus. Please add them manually.');
      }

      setParsedSubjectName(subjectName);
      setParsedCategories(categories);

      const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
      
      if (Math.abs(totalWeight - 100) > 0.1) {
        setPdfParseError(`Warning: Category weights sum to ${totalWeight.toFixed(1)}%, not 100%. Please adjust manually.`);
        toast.warning(`Weights sum to ${totalWeight.toFixed(1)}%, not 100%`);
      } else {
        toast.success(subjectName 
          ? `Syllabus parsed successfully! Found: ${subjectName}`
          : 'Syllabus parsed successfully!'
        );
      }
    } catch (error) {
      console.error('PDF parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse PDF';
      setPdfParseError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsPdfParsing(false);
      // Reset file input
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const applyParsedCategories = () => {
    if (!parsedCategories || !selectedYearId || !selectedSemesterId) return;

    let subjectId = selectedSubjectId;

    // If no subject is selected, create a new one with the parsed subject name
    if (!subjectId && parsedSubjectName) {
      // Create the subject with AI-detected name
      addSubject(selectedYearId, selectedSemesterId, parsedSubjectName);
      
      // Get the newly created subject
      const year = academicYears.find(y => y.id === selectedYearId);
      const semester = year?.semesters.find(s => s.id === selectedSemesterId);
      const newSubject = semester?.subjects.find(s => s.name === parsedSubjectName);
      
      if (newSubject) {
        subjectId = newSubject.id;
        setSelectedSubject(subjectId);
        toast.success(`Created subject: ${parsedSubjectName}`);
      }
    }

    if (!subjectId) {
      toast.error('Please select or create a subject first');
      return;
    }

    // Get the current subject for deletion
    const year = academicYears.find(y => y.id === selectedYearId);
    const semester = year?.semesters.find(s => s.id === selectedSemesterId);
    const subject = semester?.subjects.find(s => s.id === subjectId);

    // Clear existing categories and add new ones
    subject?.categories.forEach(cat => {
      deleteCategory(selectedYearId, selectedSemesterId, subjectId, cat.id);
    });

    // Add parsed categories
    parsedCategories.forEach(cat => {
      addCategory(selectedYearId, selectedSemesterId, subjectId, cat.name, cat.weight);
    });

    toast.success(`Added ${parsedCategories.length} categories from syllabus`);
    setParsedCategories(null);
    setParsedSubjectName('');
    setPdfParseError(null);
  };

  // Subject Detail View
  if (currentSubject) {
    const subjectGrade = calculateSubjectGrade(currentSubject);
    const subjectGPA = percentageToGPA(subjectGrade);
    
    return (
      <div className="max-w-5xl mx-auto animate-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSubject(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: currentSubject.color + '20', color: currentSubject.color }}
          >
            {currentSubject.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{currentSubject.name}</h1>
            <div className="flex items-center gap-3">
              <p style={{ color: getGradeColorHex(subjectGrade) }} className="text-sm font-medium">
                Current Grade: {subjectGrade.toFixed(1)}% ({getLetterGrade(subjectGrade)})
              </p>
              <span className="text-sm text-muted-foreground">
                GPA: {subjectGPA.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Weight Warning */}
        {weightWarning && (
          <Card className={cn(
            "p-4 mb-6 flex items-center gap-3",
            totalWeight < 100 ? "bg-amber/10 border-amber/30" : "bg-ruby/10 border-ruby/30"
          )}>
            <AlertTriangle className={cn("w-5 h-5", totalWeight < 100 ? "text-amber" : "text-ruby")} />
            <div>
              <p className="font-medium">
                Category weights total {totalWeight}%
              </p>
              <p className="text-sm text-muted-foreground">
                {totalWeight < 100 
                  ? `Add ${100 - totalWeight}% more weight to reach 100%`
                  : `Remove ${totalWeight - 100}% to equal 100%`
                }
              </p>
            </div>
          </Card>
        )}

        {/* Categories Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Assessment Categories</h2>
              <p className="text-sm text-muted-foreground">
                Total weight: {totalWeight}% / 100%
              </p>
            </div>
            <Button 
              onClick={() => setCategoryDialog({ open: true, name: '', weight: '' })} 
              className="gap-2 bg-primary hover:bg-navy-light"
              disabled={totalWeight >= 100}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>

          {currentSubject.categories.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No categories yet. Add a category to start tracking grades.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentSubject.categories.map((category) => {
                const avg = calculateCategoryAverage(category);
                const isExpanded = expandedCategories.has(category.id);
                
                return (
                  <Card key={category.id} className="overflow-hidden">
                    {/* Category Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {category.weight}%
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: getGradeColorHex(avg) }}>
                          Average: {avg.toFixed(1)}%
                        </p>
                        {/* Progress Bar */}
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden w-full max-w-md">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(avg, 100)}%`,
                              backgroundColor: getGradeColorHex(avg)
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryDialog({ 
                              open: true, 
                              edit: category.id,
                              name: category.name, 
                              weight: category.weight.toString() 
                            });
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignmentDialog({ open: true, categoryId: category.id, name: '', earned: '', total: '' });
                          }}
                          className="gap-1 bg-primary hover:bg-navy-light"
                        >
                          <Plus className="w-3 h-3" />
                          Add Assignment
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Assignments */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-border"
                        >
                          {category.assignments.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              No assignments yet
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {category.assignments.map((assignment) => (
                                <div key={assignment.id} className="px-6 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                                  <div>
                                    <p className="font-medium">{assignment.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {assignment.earnedPoints} / {assignment.totalPoints} points
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span 
                                      className="font-semibold"
                                      style={{ color: getGradeColorHex(assignment.percentage) }}
                                    >
                                      {assignment.percentage.toFixed(1)}%
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => setAssignmentDialog({
                                        open: true,
                                        categoryId: category.id,
                                        edit: assignment.id,
                                        name: assignment.name,
                                        earned: assignment.earnedPoints.toString(),
                                        total: assignment.totalPoints.toString(),
                                      })}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-ruby hover:text-ruby"
                                      onClick={() => handleDeleteAssignment(category.id, assignment.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Dialog */}
        <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{categoryDialog.edit ? 'Edit Category' : 'Add Category'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  placeholder="e.g., Homework, Exams, Labs"
                  value={categoryDialog.name}
                  onChange={(e) => setCategoryDialog(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={categoryDialog.weight}
                  onChange={(e) => setCategoryDialog(prev => ({ ...prev, weight: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {categoryDialog.edit 
                    ? `Current total: ${totalWeight}%`
                    : `Remaining available: ${100 - totalWeight}%`
                  }
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialog({ open: false, name: '', weight: '' })}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategory}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={assignmentDialog.open} onOpenChange={(open) => setAssignmentDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{assignmentDialog.edit ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Assignment Name</Label>
                <Input
                  placeholder="e.g., Homework 1, Midterm Exam"
                  value={assignmentDialog.name}
                  onChange={(e) => setAssignmentDialog(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Points Earned</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 85"
                    value={assignmentDialog.earned}
                    onChange={(e) => setAssignmentDialog(prev => ({ ...prev, earned: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Points</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={assignmentDialog.total}
                    onChange={(e) => setAssignmentDialog(prev => ({ ...prev, total: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignmentDialog({ open: false, categoryId: '', name: '', earned: '', total: '' })}>
                Cancel
              </Button>
              <Button onClick={handleSaveAssignment}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main Grades View
  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold mb-2">Grades</h1>
        <p className="text-muted-foreground">Track your academic performance across all subjects</p>
      </div>
      
      {/* Sync Status Bar */}
      {renderSyncStatusBar()}

      {/* Sync Status Bar */}
      {gradesSyncStatus === 'syncing' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300">Syncing grades to cloud...</span>
        </div>
      )}
      {gradesSyncStatus === 'synced' && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-300">
            All grades saved · Last synced {lastSyncedAt}
          </span>
        </div>
      )}
      {gradesSyncStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">
            Could not sync — data is safe locally
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                setGradesSyncStatus('syncing');
                const result = await gradesSyncService.syncGradesToSupabase(session.user.id, academicYears);
                if (result.error) {
                  setGradesSyncStatus('error');
                  setGradesSyncError(result.error);
                } else if (result.data) {
                  useStore.setState({ academicYears: result.data });
                  setGradesSyncStatus('synced');
                  setLastSyncedAt(new Date().toLocaleTimeString());
                }
              }
            }}
            className="gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      )}

      {/* {selectedSemesterId && (
        <div className="flex gap-2 mb-4">
          <Button onClick={handleImport} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import Grades from CSV
          </Button>
          <Button onClick={handlePdfImport} variant="outline" className="gap-2" disabled={isPdfParsing}>
            {isPdfParsing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Parse Syllabus from PDF
          </Button>
        </div>
      )} */}

      {/* Parsed Categories Preview */}
      {parsedCategories && (
        <Card className="p-4 mb-6 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Parsed Syllabus</h3>
          </div>
          
          {/* Subject Name Input - Show when no subject is selected */}
          {!selectedSubjectId && (
            <div className="mb-4">
              <Label htmlFor="subjectName" className="text-sm font-medium mb-2 block">
                Subject/Course Name (detected from syllabus)
              </Label>
              <Input
                id="subjectName"
                value={parsedSubjectName}
                onChange={(e) => setParsedSubjectName(e.target.value)}
                placeholder="Enter subject name (e.g., CS 101: Introduction to Programming)"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can edit the subject name before creating it
              </p>
            </div>
          )}
          
          {pdfParseError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-amber/10 text-amber rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              {pdfParseError}
            </div>
          )}
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-muted-foreground">Grading Categories:</p>
            {parsedCategories.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="font-medium">{cat.name}</span>
                <span className="text-sm text-muted-foreground">{cat.weight}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-2 border-t font-semibold">
              <span>Total</span>
              <span className={cn(
                Math.abs(parsedCategories.reduce((sum, c) => sum + c.weight, 0) - 100) > 0.1
                  ? "text-amber"
                  : "text-emerald"
              )}>
                {parsedCategories.reduce((sum, c) => sum + c.weight, 0).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={applyParsedCategories} 
              className="gap-2 bg-primary hover:bg-navy-light"
              disabled={!selectedYearId || !selectedSemesterId}
            >
              {selectedSubjectId ? 'Apply Categories' : `Create "${parsedSubjectName || 'Subject'}" & Apply Categories`}
            </Button>
            <Button variant="outline" onClick={() => { setParsedCategories(null); setParsedSubjectName(''); setPdfParseError(null); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Academic Year Section */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">Academic Year</h2>
              <p className="text-sm text-muted-foreground">Select or create an academic year</p>
            </div>
          </div>
          <Button onClick={() => setYearDialog({ open: true, value: '' })} className="gap-2 bg-primary hover:bg-navy-light">
            <Plus className="w-4 h-4" />
            New Year
          </Button>
        </div>
        <Select value={selectedYearId || ''} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an academic year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Semester Section */}
      {selectedYearId && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Semester</h2>
              <p className="text-sm text-muted-foreground">Select or create a semester</p>
            </div>
            <Button onClick={() => setSemesterDialog({ open: true, value: '' })} className="gap-2 bg-primary hover:bg-navy-light">
              <Plus className="w-4 h-4" />
              New Semester
            </Button>
          </div>
          <Select value={selectedSemesterId || ''} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a semester" />
            </SelectTrigger>
            <SelectContent>
              {currentYear?.semesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      {/* Subjects Section */}
      {selectedSemesterId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Your Subjects</h2>
                <p className="text-sm text-muted-foreground">Manage your courses and track grades</p>
              </div>
            </div>
            <Button onClick={() => setSubjectDialog({ open: true, value: '' })} className="gap-2 bg-primary hover:bg-navy-light">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </div>

          {(!currentSemester || currentSemester.subjects.length === 0) ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No subjects yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first subject to start tracking grades
              </p>
              <Button onClick={() => setSubjectDialog({ open: true, value: '' })} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSemester.subjects.map((subject, index) => {
                const grade = calculateSubjectGrade(subject);
                const gpa = percentageToGPA(grade);
                const hasGrades = subject.categories.some(c => c.assignments.length > 0);
                const subjectTotalWeight = getTotalCategoryWeight(subject);
                
                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="p-5 cursor-pointer hover:shadow-soft transition-all group relative"
                      onClick={() => setSelectedSubject(subject.id)}
                    >
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: subject.color + '20' }}
                        >
                          <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold truncate">{subject.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {subject.categories.length} categories • {subjectTotalWeight}% weight
                          </p>
                        </div>
                      </div>


                      
                      {hasGrades ? (
                        <div className="text-center py-2">
                          <p 
                            className="text-4xl font-bold"
                            style={{ color: getGradeColorHex(grade) }}
                          >
                            {grade.toFixed(1)}%
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <span 
                              className="text-sm font-medium"
                              style={{ color: getGradeColorHex(grade) }}
                            >
                              {getLetterGrade(grade)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              • GPA: {gpa.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No grades yet</p>
                        </div>
                      )}
                      
                      {subjectTotalWeight !== 100 && subject.categories.length > 0 && (
                        <div className="mt-2 text-center">
                          <span className="text-xs text-amber">
                            Weights don't equal 100%
                          </span>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Year Dialog */}
      <Dialog open={yearDialog.open} onOpenChange={(open) => setYearDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{yearDialog.edit ? 'Edit Year' : 'Add Academic Year'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Year Name</Label>
            <Input
              placeholder="e.g., 2025-2026"
              value={yearDialog.value}
              onChange={(e) => setYearDialog(prev => ({ ...prev, value: e.target.value }))}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYearDialog({ open: false, value: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveYear}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Semester Dialog */}
      <Dialog open={semesterDialog.open} onOpenChange={(open) => setSemesterDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{semesterDialog.edit ? 'Edit Semester' : 'Add Semester'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Semester Name</Label>
            <Input
              placeholder="e.g., Fall 2025, Spring 2026"
              value={semesterDialog.value}
              onChange={(e) => setSemesterDialog(prev => ({ ...prev, value: e.target.value }))}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSemesterDialog({ open: false, value: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSemester}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject Dialog */}
      <Dialog open={subjectDialog.open} onOpenChange={(open) => setSubjectDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subjectDialog.edit ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Subject Name</Label>
            <Input
              placeholder="e.g., Multivariable Calculus, General Chemistry"
              value={subjectDialog.value}
              onChange={(e) => setSubjectDialog(prev => ({ ...prev, value: e.target.value }))}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialog({ open: false, value: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
        accept=".pdf"
        style={{ display: 'none' }}
      />
    </div>
  );
}
