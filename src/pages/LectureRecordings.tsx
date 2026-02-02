import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Play, 
  Pause,
  ChevronDown,
  Plus,
  BookOpen,
  ArrowLeft,
  Clock,
  FileText,
  Sparkles,
  Trash2,
  Edit,
  Download,
  Volume2,
  Upload,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RecordingControls from '@/components/recordings/RecordingControls';
import RecordingPlayer from '@/components/recordings/RecordingPlayer';
import RecordingNotes from '@/components/recordings/RecordingNotes';

interface Recording {
  id: string;
  user_id: string;
  subject_id: string;
  year_id: string;
  semester_id: string;
  name: string;
  audio_url: string | null;
  duration: number;
  transcript: string | null;
  notes: string | null;
  summary: string | null;
  key_points: string[];
  status: 'draft' | 'recording' | 'completed';
  created_at: string;
  updated_at: string;
}

export default function LectureRecordings() {
  const { academicYears, selectedYearId, selectedSemesterId, setSelectedYear, setSelectedSemester } = useStore();
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [newRecordingDialog, setNewRecordingDialog] = useState(false);
  const [newRecordingName, setNewRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSubjectId, setRecordingSubjectId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);

  // Get current data
  const currentYear = academicYears.find(y => y.id === selectedYearId);
  const currentSemester = currentYear?.semesters.find(s => s.id === selectedSemesterId);
  const currentSubject = currentSemester?.subjects.find(s => s.id === selectedSubjectId);

  // Load recordings
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lecture_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRecordings((data || []).map(r => ({
        ...r,
        status: r.status as 'draft' | 'recording' | 'completed',
        key_points: Array.isArray(r.key_points) ? r.key_points as string[] : []
      })));
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recordings by subject
  const subjectRecordings = useMemo(() => {
    if (!selectedSubjectId) return [];
    return recordings.filter(r => r.subject_id === selectedSubjectId);
  }, [recordings, selectedSubjectId]);

  // Get recording count per subject
  const getRecordingCount = (subjectId: string) => {
    return recordings.filter(r => r.subject_id === subjectId).length;
  };

  const handleStartRecording = async () => {
    if (!newRecordingName.trim() || !recordingSubjectId) {
      toast.error('Please enter a recording name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('lecture_recordings')
        .insert({
          user_id: user.id,
          subject_id: recordingSubjectId,
          year_id: selectedYearId,
          semester_id: selectedSemesterId,
          name: newRecordingName.trim(),
          status: 'recording'
        })
        .select()
        .single();

      if (error) throw error;

      const newRecording: Recording = {
        ...data,
        status: data.status as 'draft' | 'recording' | 'completed',
        key_points: []
      };
      
      setRecordings(prev => [newRecording, ...prev]);
      setSelectedRecording(newRecording);
      setSelectedSubjectId(recordingSubjectId);
      setIsRecording(true);
      setNewRecordingDialog(false);
      setNewRecordingName('');
      toast.success('Recording started');
    } catch (error) {
      console.error('Error creating recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async (audioBlob: Blob, duration: number) => {
    if (!selectedRecording) return;

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload audio to storage
      const fileName = `${user.id}/${selectedRecording.id}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lecture-audio')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lecture-audio')
        .getPublicUrl(fileName);

      const audioUrl = urlData?.publicUrl || null;

      // Update recording with audio URL and status
      const { error } = await supabase
        .from('lecture_recordings')
        .update({
          status: 'completed',
          duration: Math.round(duration),
          audio_url: audioUrl
        })
        .eq('id', selectedRecording.id);

      if (error) throw error;

      setRecordings(prev => prev.map(r => 
        r.id === selectedRecording.id 
          ? { ...r, status: 'completed' as const, duration: Math.round(duration), audio_url: audioUrl }
          : r
      ));
      setSelectedRecording(prev => prev ? { ...prev, status: 'completed', duration: Math.round(duration), audio_url: audioUrl } : null);
      setIsRecording(false);
      setIsUploading(false);
      toast.success('Recording saved');

      // Auto-transcribe the recording
      handleTranscribeRecording(audioBlob);
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
      setIsUploading(false);
    }
  };

  const handleTranscribeRecording = async (audioBlob: Blob, recordingId?: string) => {
    const targetId = recordingId || selectedRecording?.id;
    if (!targetId) return;

    const targetRecording = recordings.find(r => r.id === targetId);
    if (!targetRecording) return;

    try {
      setIsTranscribing(true);
      setTranscribingId(targetId);
      
      // Determine audio source - use provided blob or fetch from URL
      let audioData = audioBlob;
      
      if (!audioBlob && targetRecording.audio_url) {
        // Fetch audio from URL and convert to blob
        try {
          const response = await fetch(targetRecording.audio_url);
          audioData = await response.blob();
        } catch (fetchError) {
          console.error('Error fetching audio:', fetchError);
          throw new Error('Could not access audio file for transcription');
        }
      }

      if (!audioData) {
        throw new Error('No audio data available for transcription');
      }

      toast.info('Transcribing audio...', { duration: 3000 });

      const formData = new FormData();
      formData.append('audio', audioData, 'audio.webm');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('402')) {
          throw new Error('Please add credits to your workspace.');
        } else {
          throw new Error(data.error);
        }
      }
      
      if (data.success && data.transcript) {
        // Save transcript to database
        const { error } = await supabase
          .from('lecture_recordings')
          .update({ transcript: data.transcript })
          .eq('id', targetId);

        if (error) throw error;

        setRecordings(prev => prev.map(r =>
          r.id === targetId
            ? { ...r, transcript: data.transcript }
            : r
        ));
        
        if (selectedRecording?.id === targetId) {
          setSelectedRecording(prev => prev ? { ...prev, transcript: data.transcript } : null);
        }
        
        toast.success('Transcription complete');
      } else if (data.warning || data.message) {
        toast.info(data.message || data.warning);
      } else {
        toast.warning('Could not transcribe audio - no speech detected');
      }
    } catch (error: any) { // Use 'any' for broader error handling, then refine
      console.error('Error transcribing:', error);
      let errorMessage = 'Failed to transcribe audio';

      // Check if the error object itself contains a message
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      } else if (error && typeof error === 'object' && 'data' in error && (error as any).data?.error) {
        // This handles the case where supabase.functions.invoke returns an error object with a data.error property
        errorMessage = (error as any).data.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsTranscribing(false);
      setTranscribingId(null);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('lecture_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(null);
      }
      toast.success('Recording deleted');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  const handleUpdateNotes = async (recordingId: string, notes: string, summary: string, keyPoints: string[]) => {
    try {
      const { error } = await supabase
        .from('lecture_recordings')
        .update({
          notes,
          summary,
          key_points: keyPoints
        })
        .eq('id', recordingId);

      if (error) throw error;

      setRecordings(prev => prev.map(r =>
        r.id === recordingId
          ? { ...r, notes, summary, key_points: keyPoints }
          : r
      ));
      setSelectedRecording(prev => 
        prev?.id === recordingId 
          ? { ...prev, notes, summary, key_points: keyPoints }
          : prev
      );
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording Detail View
  if (selectedRecording) {
    return (
      <div className="max-w-5xl mx-auto animate-in">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedRecording(null);
              setIsRecording(false);
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{selectedRecording.name}</h1>
            <p className="text-sm text-muted-foreground">
              {currentSubject?.name} • {formatDuration(selectedRecording.duration)}
            </p>
          </div>
          {!isRecording && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteRecording(selectedRecording.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        <Tabs defaultValue={isRecording ? 'record' : 'notes'} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="record" disabled={selectedRecording.status === 'completed' && !isRecording}>
              <Mic className="w-4 h-4 mr-2" />
              Record
            </TabsTrigger>
            <TabsTrigger value="playback" disabled={selectedRecording.status !== 'completed'}>
              <Play className="w-4 h-4 mr-2" />
              Playback
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record">
            <RecordingControls
              isRecording={isRecording}
              onStop={handleStopRecording}
              recordingName={selectedRecording.name}
            />
          </TabsContent>

          <TabsContent value="playback">
            <RecordingPlayer recording={selectedRecording} />
          </TabsContent>

          <TabsContent value="notes">
            <RecordingNotes
              recording={selectedRecording}
              onSave={(notes, summary, keyPoints) => 
                handleUpdateNotes(selectedRecording.id, notes, summary, keyPoints)
              }
              isTranscribing={isTranscribing && transcribingId === selectedRecording.id}
              onRetranscribe={() => handleTranscribeRecording(undefined, selectedRecording.id)}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Subject Recordings View
  if (selectedSubjectId && currentSubject) {
    return (
      <div className="max-w-5xl mx-auto animate-in">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSubjectId(null)}
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
            <p className="text-sm text-muted-foreground">
              {subjectRecordings.length} recording{subjectRecordings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => {
              setRecordingSubjectId(selectedSubjectId);
              setNewRecordingDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Recording
          </Button>
        </div>

        {subjectRecordings.length === 0 ? (
          <Card className="p-8 text-center">
            <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
            <p className="text-muted-foreground mb-4">
              Start recording your lectures to review them later.
            </p>
            <Button
              onClick={() => {
                setRecordingSubjectId(selectedSubjectId);
                setNewRecordingDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {subjectRecordings.map((recording, index) => (
              <motion.div
                key={recording.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 hover:shadow-soft transition-all cursor-pointer group"
                  onClick={() => setSelectedRecording(recording)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      recording.status === 'completed' 
                        ? "bg-emerald/10 text-emerald"
                        : "bg-amber/10 text-amber"
                    )}>
                      {recording.status === 'completed' ? (
                        <Volume2 className="w-6 h-6" />
                      ) : (
                        <Mic className="w-6 h-6 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {recording.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(recording.duration)}
                        </span>
                        <span>
                          {new Date(recording.created_at).toLocaleDateString()}
                        </span>
                        {recording.notes && (
                          <span className="flex items-center gap-1 text-primary">
                            <FileText className="w-3 h-3" />
                            Has notes
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecording(recording.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-ruby" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main View - Year/Semester/Subject Selection
  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="mb-6">
        <motion.h1
          className="text-3xl font-display font-bold mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Lecture Recordings
        </motion.h1>
        <p className="text-muted-foreground">
          Record, playback, and generate notes from your lectures
        </p>
      </div>

      {/* Year & Semester Selection */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Academic Year</Label>
            <Select
              value={selectedYearId || ''}
              onValueChange={(value) => setSelectedYear(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Semester</Label>
            <Select
              value={selectedSemesterId || ''}
              onValueChange={(value) => setSelectedSemester(value)}
              disabled={!currentYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {currentYear?.semesters.map(semester => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Subjects Grid */}
      {!currentSemester ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Semester</h3>
          <p className="text-muted-foreground">
            Choose an academic year and semester to view your subjects and recordings.
          </p>
        </Card>
      ) : currentSemester.subjects.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Subjects Yet</h3>
          <p className="text-muted-foreground">
            Add subjects in the Grades section to start recording lectures.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSemester.subjects.map((subject, index) => {
            const recordingCount = getRecordingCount(subject.id);
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-5 hover:shadow-soft transition-all cursor-pointer group"
                  onClick={() => setSelectedSubjectId(subject.id)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: subject.color + '20', color: subject.color }}
                    >
                      {subject.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {recordingCount} recording{recordingCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordingSubjectId(subject.id);
                      setSelectedSubjectId(subject.id);
                      setNewRecordingDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Recording
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Recording Dialog */}
      <Dialog open={newRecordingDialog} onOpenChange={setNewRecordingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="recording-name">Recording Name</Label>
              <Input
                id="recording-name"
                value={newRecordingName}
                onChange={(e) => setNewRecordingName(e.target.value)}
                placeholder="e.g., Lecture 1 - Introduction"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRecordingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartRecording} disabled={!newRecordingName.trim()}>
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}