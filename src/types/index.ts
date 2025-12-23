// OSSM Study Hub Types

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: Date;
}

export interface Assignment {
  id: string;
  name: string;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  weight: number; // Percentage weight (e.g., 60 for 60%)
  assignments: Assignment[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  categories: Category[];
}

export interface Semester {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface AcademicYear {
  id: string;
  name: string; // e.g., "2025-2026"
  semesters: Semester[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  questions: QuizQuestion[];
  createdAt: Date;
  completedAt?: Date;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: { name: string; type: string; url: string }[];
}

export interface Element {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  category: string;
  electronConfiguration: string;
  electronegativity?: number;
  oxidationStates?: string;
  meltingPoint?: number;
  boilingPoint?: number;
  density?: number;
  discoveryYear?: number;
  discoveredBy?: string;
  block: string;
  group: number;
  period: number;
}

// Utility functions
export function calculateCategoryAverage(category: Category): number {
  if (category.assignments.length === 0) return 0;
  const total = category.assignments.reduce((sum, a) => sum + a.percentage, 0);
  return total / category.assignments.length;
}

export function calculateSubjectGrade(subject: Subject): number {
  if (subject.categories.length === 0) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const category of subject.categories) {
    if (category.assignments.length > 0) {
      const avg = calculateCategoryAverage(category);
      weightedSum += avg * category.weight;
      totalWeight += category.weight;
    }
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return 'grade-a';
  if (percentage >= 80) return 'grade-b';
  if (percentage >= 70) return 'grade-c';
  if (percentage >= 60) return 'grade-d';
  return 'grade-f';
}

export function getGradeColorHex(percentage: number): string {
  if (percentage >= 90) return 'hsl(160, 84%, 39%)';
  if (percentage >= 80) return 'hsl(199, 89%, 48%)';
  if (percentage >= 70) return 'hsl(38, 92%, 50%)';
  if (percentage >= 60) return 'hsl(25, 95%, 53%)';
  return 'hsl(0, 72%, 51%)';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
