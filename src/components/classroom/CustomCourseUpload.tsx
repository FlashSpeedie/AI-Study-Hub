import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  X, 
  Plus,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content?: string;
}

interface CustomCourseUploadProps {
  onCreateCourse: (course: {
    name: string;
    description: string;
    files: UploadedFile[];
    topics: string[];
  }) => void;
  onCancel: () => void;
}

export const CustomCourseUpload = ({ onCreateCourse, onCancel }: CustomCourseUploadProps) => {
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [topics, setTopics] = useState<string[]>(['']);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < Math.min(selectedFiles.length, 10); i++) {
      const file = selectedFiles[i];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max 10MB per file.`);
        continue;
      }

      // Read text-based files
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const content = await file.text();
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: content.slice(0, 50000), // Limit content
        });
      } else {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles].slice(0, 10));
    toast.success(`${newFiles.length} file(s) added`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTopic = () => {
    if (topics.length < 10) {
      setTopics([...topics, '']);
    }
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    if (!courseName.trim()) {
      toast.error('Please enter a course name');
      return;
    }

    const validTopics = topics.filter(t => t.trim());
    
    onCreateCourse({
      name: courseName.trim(),
      description: courseDescription.trim(),
      files,
      topics: validTopics,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card rounded-2xl border border-border p-6 max-w-2xl mx-auto shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-emerald/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Create Custom Course</h2>
          <p className="text-sm text-muted-foreground">Upload materials and define your learning path</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Course Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Course Name *
          </label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g., Advanced Machine Learning"
            className="bg-background"
          />
        </div>

        {/* Course Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <Textarea
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            placeholder="Describe what this course covers, key learning objectives..."
            rows={3}
            className="bg-background resize-none"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Key Topics
          </label>
          <div className="space-y-2">
            {topics.map((topic, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={topic}
                  onChange={(e) => updateTopic(index, e.target.value)}
                  placeholder={`Topic ${index + 1}`}
                  className="bg-background"
                />
                {topics.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTopic(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {topics.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTopic}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </Button>
            )}
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Course Materials (Optional)
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              TXT, MD, PDF, DOC • Max 10 files • 10MB each
            </p>
          </div>

          {/* Uploaded Files List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {files.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            <BookOpen className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
