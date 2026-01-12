import { motion } from 'framer-motion';
import { 
  Atom, 
  Code, 
  BookOpen, 
  Calculator, 
  Globe, 
  Palette,
  Music,
  Beaker,
  Plus
} from 'lucide-react';

export interface Course {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  isCustom?: boolean;
}

export const defaultCourses: Course[] = [
  { 
    id: 'physics', 
    name: 'Physics', 
    icon: <Atom className="h-6 w-6" />, 
    color: 'from-sky to-sky-light',
    description: 'Mechanics, Thermodynamics, Electromagnetism'
  },
  { 
    id: 'coding', 
    name: 'Programming', 
    icon: <Code className="h-6 w-6" />, 
    color: 'from-emerald to-emerald-light',
    description: 'Python, JavaScript, Algorithms'
  },
  { 
    id: 'literature', 
    name: 'Literature', 
    icon: <BookOpen className="h-6 w-6" />, 
    color: 'from-purple-500 to-purple-400',
    description: 'Analysis, Essays, Creative Writing'
  },
  { 
    id: 'math', 
    name: 'Mathematics', 
    icon: <Calculator className="h-6 w-6" />, 
    color: 'from-amber to-amber-light',
    description: 'Algebra, Calculus, Statistics'
  },
  { 
    id: 'history', 
    name: 'History', 
    icon: <Globe className="h-6 w-6" />, 
    color: 'from-orange-500 to-orange-400',
    description: 'World History, Civilizations, Events'
  },
  { 
    id: 'chemistry', 
    name: 'Chemistry', 
    icon: <Beaker className="h-6 w-6" />, 
    color: 'from-teal-500 to-teal-400',
    description: 'Organic, Inorganic, Biochemistry'
  },
  { 
    id: 'art', 
    name: 'Art History', 
    icon: <Palette className="h-6 w-6" />, 
    color: 'from-rose-500 to-rose-400',
    description: 'Movements, Artists, Techniques'
  },
  { 
    id: 'music', 
    name: 'Music Theory', 
    icon: <Music className="h-6 w-6" />, 
    color: 'from-indigo-500 to-indigo-400',
    description: 'Harmony, Rhythm, Composition'
  },
];

interface CourseSelectorProps {
  selectedCourse: string | null;
  onSelectCourse: (courseId: string) => void;
  onCreateCustom: () => void;
  customCourses?: Course[];
}

export const CourseSelector = ({ 
  selectedCourse, 
  onSelectCourse, 
  onCreateCustom,
  customCourses = []
}: CourseSelectorProps) => {
  const allCourses = [...defaultCourses, ...customCourses];

  return (
    <div className="space-y-6">
      {/* Default Courses */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Available Subjects</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allCourses.map((course, index) => (
            <motion.button
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectCourse(course.id)}
              className={`relative group p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                selectedCourse === course.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${course.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${course.color} text-white shadow-sm`}>
                  {course.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{course.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {course.description}
                  </p>
                </div>
                {course.isCustom && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Custom
                  </span>
                )}
              </div>

              {selectedCourse === course.id && (
                <motion.div
                  layoutId="courseSelector"
                  className="absolute inset-0 border-2 border-primary rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}

          {/* Create Custom Course Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: allCourses.length * 0.05 }}
            onClick={onCreateCustom}
            className="relative group p-4 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Custom Course</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your own materials
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export const getCourseById = (id: string, customCourses: Course[] = []): Course | undefined => {
  return [...defaultCourses, ...customCourses].find(c => c.id === id);
};
