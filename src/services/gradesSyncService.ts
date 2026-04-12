import { supabase } from '@/integrations/supabase/client'

export async function loadAllGradesFromSupabase(userId: string) {
  try {
    const [yearsRes, semestersRes, subjectsRes, categoriesRes, assignmentsRes] =
      await Promise.all([
        supabase.from('academic_years')
          .select('*').eq('user_id', userId).order('created_at'),
        supabase.from('semesters')
          .select('*').eq('user_id', userId).order('created_at'),
        supabase.from('subjects')
          .select('*').eq('user_id', userId).order('created_at'),
        supabase.from('categories')
          .select('*').eq('user_id', userId).order('created_at'),
        supabase.from('assignments')
          .select('*').eq('user_id', userId).order('created_at'),
      ])

    const errors = [yearsRes, semestersRes, subjectsRes,
      categoriesRes, assignmentsRes]
      .filter(r => r.error).map(r => r.error?.message)
    
    if (errors.length > 0) {
      console.error('loadAllGradesFromSupabase errors:', errors)
      return { data: null, error: errors.join(', ') }
    }

    const years = yearsRes.data || []
    const semesters = semestersRes.data || []
    const subjects = subjectsRes.data || []
    const categories = categoriesRes.data || []
    const assignments = assignmentsRes.data || []

    const result = years.map(year => ({
      id: year.id,
      name: year.name,
      createdAt: new Date(year.created_at),
      semesters: semesters
        .filter(s => s.academic_year_id === year.id)
        .map(semester => ({
          id: semester.id,
          name: semester.name,
          academicYearId: semester.academic_year_id,
          createdAt: new Date(semester.created_at),
          subjects: subjects
            .filter(sub => sub.semester_id === semester.id)
            .map(subject => ({
              id: subject.id,
              name: subject.name,
              teacher: subject.teacher || '',
              color: subject.color || '#6366f1',
              semesterId: subject.semester_id,
              createdAt: new Date(subject.created_at),
              categories: categories
                .filter(cat => cat.subject_id === subject.id)
                .map(category => ({
                  id: category.id,
                  name: category.name,
                  weight: category.weight || 0,
                  subjectId: category.subject_id,
                  createdAt: new Date(category.created_at),
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
                      categoryId: assignment.category_id,
                      createdAt: new Date(assignment.created_at),
                    }))
                }))
            }))
        }))
    }))

    return { data: result, error: null }
  } catch (err: any) {
    console.error('loadAllGradesFromSupabase exception:', err)
    return { data: null, error: err.message }
  }
}

export async function syncGradesToSupabase(
  userId: string,
  localAcademicYears: any[]
) {
  try {
    const { count, error: countError } = await supabase
      .from('academic_years')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      return { data: null, error: countError.message }
    }

    if (count && count > 0) {
      return await loadAllGradesFromSupabase(userId)
    }

    if (localAcademicYears && localAcademicYears.length > 0) {
      for (const year of localAcademicYears) {
        await saveAcademicYear(userId, year)
        for (const semester of (year.semesters || [])) {
          await saveSemester(userId, {
            ...semester,
            academic_year_id: year.id
          })
          for (const subject of (semester.subjects || [])) {
            await saveSubject(userId, {
              ...subject,
              semester_id: semester.id
            })
            for (const category of (subject.categories || [])) {
              await saveCategory(userId, {
                ...category,
                subject_id: subject.id
              })
              for (const assignment of (category.assignments || [])) {
                await saveAssignment(userId, {
                  ...assignment,
                  category_id: category.id
                })
              }
            }
          }
        }
      }
    }

    return await loadAllGradesFromSupabase(userId)
  } catch (err: any) {
    console.error('syncGradesToSupabase exception:', err)
    return { data: null, error: err.message }
  }
}

export async function saveAcademicYear(userId: string, year: any) {
  const { data, error } = await supabase
    .from('academic_years')
    .upsert({
      id: year.id,
      user_id: userId,
      name: year.name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('saveAcademicYear:', error)
  return { data, error: error?.message || null }
}

export async function saveSemester(userId: string, semester: any) {
  const { data, error } = await supabase
    .from('semesters')
    .upsert({
      id: semester.id,
      user_id: userId,
      academic_year_id: semester.academic_year_id ||
        semester.academicYearId,
      name: semester.name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('saveSemester:', error)
  return { data, error: error?.message || null }
}

export async function saveSubject(userId: string, subject: any) {
  const { data, error } = await supabase
    .from('subjects')
    .upsert({
      id: subject.id,
      user_id: userId,
      semester_id: subject.semester_id || subject.semesterId,
      name: subject.name,
      teacher: subject.teacher || '',
      color: subject.color || '#6366f1',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('saveSubject:', error)
  return { data, error: error?.message || null }
}

export async function saveCategory(userId: string, category: any) {
  const { data, error } = await supabase
    .from('categories')
    .upsert({
      id: category.id,
      user_id: userId,
      subject_id: category.subject_id || category.subjectId,
      name: category.name,
      weight: category.weight || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('saveCategory:', error)
  return { data, error: error?.message || null }
}

export async function saveAssignment(userId: string, assignment: any) {
  const { data, error } = await supabase
    .from('assignments')
    .upsert({
      id: assignment.id,
      user_id: userId,
      category_id: assignment.category_id || assignment.categoryId,
      name: assignment.name,
      earned_points: assignment.earnedPoints ??
        assignment.earned_points ?? 0,
      total_points: assignment.totalPoints ??
        assignment.total_points ?? 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('saveAssignment:', error)
  return { data, error: error?.message || null }
}

export async function deleteAcademicYear(userId: string, yearId: string) {
  const { error } = await supabase.from('academic_years')
    .delete().eq('id', yearId).eq('user_id', userId)
  if (error) console.error('deleteAcademicYear:', error)
  return { error: error?.message || null }
}

export async function deleteSemester(userId: string, semesterId: string) {
  const { error } = await supabase.from('semesters')
    .delete().eq('id', semesterId).eq('user_id', userId)
  if (error) console.error('deleteSemester:', error)
  return { error: error?.message || null }
}

export async function deleteSubject(userId: string, subjectId: string) {
  const { error } = await supabase.from('subjects')
    .delete().eq('id', subjectId).eq('user_id', userId)
  if (error) console.error('deleteSubject:', error)
  return { error: error?.message || null }
}

export async function deleteCategory(userId: string, categoryId: string) {
  const { error } = await supabase.from('categories')
    .delete().eq('id', categoryId).eq('user_id', userId)
  if (error) console.error('deleteCategory:', error)
  return { error: error?.message || null }
}

export async function deleteAssignment(userId: string, assignmentId: string) {
  const { error } = await supabase.from('assignments')
    .delete().eq('id', assignmentId).eq('user_id', userId)
  if (error) console.error('deleteAssignment:', error)
  return { error: error?.message || null }
}