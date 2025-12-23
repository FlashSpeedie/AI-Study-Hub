import { useState, useMemo } from 'react';
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
  ExternalLink
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
import { 
  calculateSubjectGrade, 
  calculateCategoryAverage, 
  getLetterGrade, 
  getGradeColor,
  getGradeColorHex,
  Subject,
  Category
} from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  } = useStore();

  // Dialog states
  const [yearDialog, setYearDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [semesterDialog, setSemesterDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [subjectDialog, setSubjectDialog] = useState<{ open: boolean; edit?: string; value: string }>({ open: false, value: '' });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; edit?: string; name: string; weight: string }>({ open: false, name: '', weight: '' });
  const [assignmentDialog, setAssignmentDialog] = useState<{ open: boolean; categoryId: string; edit?: string; name: string; earned: string; total: string }>({ open: false, categoryId: '', name: '', earned: '', total: '' });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get current data
  const currentYear = academicYears.find(y => y.id === selectedYearId);
  const currentSemester = currentYear?.semesters.find(s => s.id === selectedSemesterId);
  const currentSubject = currentSemester?.subjects.find(s => s.id === selectedSubjectId);

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

  const handleDeleteYear = (id: string) => {
    deleteAcademicYear(id);
    toast.success('Year deleted');
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

  const handleDeleteSemester = (id: string) => {
    if (!selectedYearId) return;
    deleteSemester(selectedYearId, id);
    toast.success('Semester deleted');
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

  // Subject Detail View
  if (currentSubject) {
    const subjectGrade = calculateSubjectGrade(currentSubject);
    
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
          <div>
            <h1 className="text-2xl font-display font-bold">{currentSubject.name}</h1>
            <p style={{ color: getGradeColorHex(subjectGrade) }} className="text-sm font-medium">
              Current Grade: {subjectGrade.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Assessment Categories</h2>
              <p className="text-sm text-muted-foreground">Manage weighted categories and assignments</p>
            </div>
            <Button onClick={() => setCategoryDialog({ open: true, name: '', weight: '' })} className="gap-2 bg-primary hover:bg-navy-light">
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
                const hasGrades = subject.categories.some(c => c.assignments.length > 0);
                
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
                        <h3 className="font-semibold truncate flex-1">{subject.name}</h3>
                      </div>
                      
                      {hasGrades ? (
                        <div className="text-center py-2">
                          <p 
                            className="text-4xl font-bold"
                            style={{ color: getGradeColorHex(grade) }}
                          >
                            {grade.toFixed(1)}%
                          </p>
                          <span 
                            className="text-sm font-medium"
                            style={{ color: getGradeColorHex(grade) }}
                          >
                            {getLetterGrade(grade)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No grades yet</p>
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
    </div>
  );
}
