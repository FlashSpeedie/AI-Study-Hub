import { supabase } from '@/integrations/supabase/client';
import type { AcademicYear, Semester, Subject, Category, Assignment } from '@/types';

// Retry helper for transient network errors
async function withRetry<T>(
  fn: () => T,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

interface SupabaseAcademicYear {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseSemester {
  id: string;
  user_id: string;
  academic_year_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseSubject {
  id: string;
  user_id: string;
  semester_id: string;
  name: string;
  teacher: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseCategory {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseAssignment {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  earned_points: number;
  total_points: number;
  date: string;
  created_at: string;
  updated_at: string;
}

interface SyncResult {
  data: AcademicYear[] | null;
  error: string | null;
}

interface DbResult<T> {
  data: T | null;
  error: string | null;
}

// Convert Supabase data back to local format
function convertFromSupabase(
  years: SupabaseAcademicYear[],
  semesters: SupabaseSemester[],
  subjects: SupabaseSubject[],
  categories: SupabaseCategory[],
  assignments: SupabaseAssignment[]
): AcademicYear[] {
  return years.map(year => {
    const yearSemesters = semesters
      .filter(s => s.academic_year_id === year.id)
      .map(semester => {
        const semesterSubjects = subjects
          .filter(s => s.semester_id === semester.id)
          .map(subject => {
            const subjectCategories = categories
              .filter(c => c.subject_id === subject.id)
              .map(category => ({
                id: category.id,
                name: category.name,
                weight: category.weight,
                assignments: assignments
                  .filter(a => a.category_id === category.id)
                  .map(assignment => ({
                    id: assignment.id,
                    name: assignment.name,
                    earnedPoints: assignment.earned_points,
                    totalPoints: assignment.total_points,
                    percentage: assignment.total_points > 0 
                      ? (assignment.earned_points / assignment.total_points) * 100 
                      : 0,
                    createdAt: new Date(assignment.created_at),
                  })),
              }));
            return {
              id: subject.id,
              name: subject.name,
              teacher: (subject as unknown as { teacher?: string }).teacher || '',
              color: subject.color || '#6366f1',
              categories: subjectCategories,
            };
          });
        return {
          id: semester.id,
          name: semester.name,
          subjects: semesterSubjects,
        };
      });
    return {
      id: year.id,
      name: year.name,
      semesters: yearSemesters,
    };
  });
}

export async function syncGradesToSupabase(
  userId: string,
  localAcademicYears: AcademicYear[]
): Promise<SyncResult> {
  try {
    // Check if Supabase already has data (with retry)
    const { count, error: countError } = await withRetry(() =>
      supabase
        .from('academic_years')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    );

    if (countError) {
      return { data: null, error: countError.message };
    }

    // If Supabase has data, fetch and return it
    if (count && count > 0) {
      const { data: years, error: yearsError } = await withRetry(() =>
        supabase
          .from('academic_years')
          .select('*')
          .eq('user_id', userId)
      );

      if (yearsError) return { data: null, error: yearsError.message };
      if (!years || years.length === 0) return { data: [], error: null };

      const yearIds = years.map(y => y.id);

      const { data: semesters, error: semestersError } = await withRetry(() =>
        supabase
          .from('semesters')
          .select('*')
          .in('academic_year_id', yearIds)
      );

      if (semestersError) return { data: null, error: semestersError.message };

      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .in('semester_id', semesters?.map(s => s.id) || []);

      if (subjectsError) return { data: null, error: subjectsError.message };

      const { data: categories, error: categoriesError } = await withRetry(() =>
        supabase
          .from('categories')
          .select('*')
          .in('subject_id', subjects?.map(s => s.id) || [])
      );

      if (categoriesError) return { data: null, error: categoriesError.message };

      const { data: assignments, error: assignmentsError } = await withRetry(() =>
        supabase
          .from('assignments')
          .select('*')
          .in('category_id', categories?.map(c => c.id) || [])
      );

      if (assignmentsError) return { data: null, error: assignmentsError.message };

      const result = convertFromSupabase(
        years as unknown as SupabaseAcademicYear[],
        semesters as unknown as SupabaseSemester[],
        subjects as unknown as SupabaseSubject[],
        categories as unknown as SupabaseCategory[],
        assignments as unknown as SupabaseAssignment[]
      );

      return { data: result, error: null };
    }

    // If Supabase is empty and local has data, upload it (with retry)
    if (count === 0 && localAcademicYears.length > 0) {
      // Create ID mapping objects
      const yearIdMap: Record<string, string> = {}
      const semesterIdMap: Record<string, string> = {}
      const subjectIdMap: Record<string, string> = {}
      const categoryIdMap: Record<string, string> = {}

      for (const year of localAcademicYears) {
        const newYearId = crypto.randomUUID()
        yearIdMap[year.id] = newYearId

        const yearResult = await saveAcademicYear(userId, {
          ...year,
          id: newYearId,
        });
        if (yearResult.error) return { data: null, error: yearResult.error };

        for (const semester of year.semesters) {
          const newSemId = crypto.randomUUID()
          semesterIdMap[semester.id] = newSemId

          const semesterResult = await saveSemester(userId, {
            ...semester,
            id: newSemId,
            academic_year_id: newYearId,
          });
          if (semesterResult.error) return { data: null, error: semesterResult.error };

          for (const subject of semester.subjects) {
            const newSubId = crypto.randomUUID()
            subjectIdMap[subject.id] = newSubId

            const subjectResult = await saveSubject(userId, {
              ...subject,
              id: newSubId,
              semester_id: newSemId,
            });
            if (subjectResult.error) return { data: null, error: subjectResult.error };

            for (const category of subject.categories) {
              const newCatId = crypto.randomUUID()
              categoryIdMap[category.id] = newCatId

              const categoryResult = await saveCategory(userId, {
                ...category,
                id: newCatId,
                subject_id: newSubId,
              });
              if (categoryResult.error) return { data: null, error: categoryResult.error };

              for (const assignment of category.assignments) {
                const newAssId = crypto.randomUUID()
                const assignmentResult = await saveAssignment(userId, {
                  ...assignment,
                  id: newAssId,
                  category_id: newCatId,
                });
                if (assignmentResult.error) return { data: null, error: assignmentResult.error };
              }
            }
          }
        }
      }

      // Fetch the uploaded data directly instead of recursing
      return syncGradesToSupabase(userId, []);
    }

    // Both empty
    return { data: [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function saveAcademicYear(
  userId: string,
  year: AcademicYear & { academic_year_id?: string }
): Promise<DbResult<SupabaseAcademicYear>> {
  try {
    // Use upsert so retries are safe (idempotent)
    const { data, error } = await supabase
      .from('academic_years')
      .upsert({
        id: year.id,
        user_id: userId,
        name: year.name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as SupabaseAcademicYear, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveSemester(
  userId: string,
  semester: Semester & { academic_year_id?: string; semester_id?: string }
): Promise<DbResult<SupabaseSemester>> {
  try {
    // Use upsert so retries are safe (idempotent)
    const { data, error } = await supabase
      .from('semesters')
      .upsert({
        id: semester.id,
        user_id: userId,
        academic_year_id: semester.academic_year_id!,
        name: semester.name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as SupabaseSemester, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveSubject(
  userId: string,
  subject: Subject & { semester_id?: string }
): Promise<DbResult<SupabaseSubject>> {
  try {
    // Use upsert so retries are safe (idempotent)
    const { data, error } = await supabase
      .from('subjects')
      .upsert({
        id: subject.id,
        user_id: userId,
        semester_id: subject.semester_id!,
        name: subject.name,
        teacher: subject.teacher || '',
        color: subject.color || '#6366f1',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as SupabaseSubject, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveCategory(
  userId: string,
  category: Category & { subject_id?: string }
): Promise<DbResult<SupabaseCategory>> {
  try {
    // Use upsert so retries are safe (idempotent)
    const { data, error } = await supabase
      .from('categories')
      .upsert({
        id: category.id,
        user_id: userId,
        subject_id: category.subject_id!,
        name: category.name,
        weight: category.weight,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as SupabaseCategory, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveAssignment(
  userId: string,
  assignment: Assignment & { category_id?: string }
): Promise<DbResult<SupabaseAssignment>> {
  try {
    // Use upsert so retries are safe (idempotent)
    const { data, error } = await supabase
      .from('assignments')
      .upsert({
        id: assignment.id,
        user_id: userId,
        category_id: assignment.category_id!,
        name: assignment.name,
        earned_points: assignment.earnedPoints,
        total_points: assignment.totalPoints,
        date: '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as SupabaseAssignment, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteAcademicYear(userId: string, yearId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', yearId)
      .eq('user_id', userId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteSemester(userId: string, semesterId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', semesterId)
      .eq('user_id', userId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteSubject(userId: string, subjectId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', userId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteCategory(userId: string, categoryId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteAssignment(userId: string, assignmentId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('user_id', userId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
