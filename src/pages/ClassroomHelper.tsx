import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Loader2,
  GraduationCap,
  ChevronLeft,
  History,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface QuestionEvent {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

const ClassroomHelper = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [questions, setQuestions] = useState<QuestionEvent[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [muteAudio, setMuteAudio] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Update current transcript display
      setCurrentTranscript(transcript);

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Set timer to process after silence
      silenceTimerRef.current = setTimeout(() => {
        if (transcript !== lastTranscriptRef.current) {
          lastTranscriptRef.current = transcript;
          processTranscript(transcript);
        }
      }, 2000);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if ((event as unknown as { error?: string }).error === 'not-allowed') {
        toast.error('Microphone access denied');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isListening]);

  const processTranscript = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      const response = await supabase.functions.invoke('classroom-helper', {
        body: {
          transcript,
          conversationHistory: questions.map(q => `Q: ${q.question} A: ${q.answer}`),
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { result, isQuestion } = response.data;

      if (isQuestion) {
        const newQuestion: QuestionEvent = {
          id: Date.now().toString(),
          question: transcript,
          answer: result,
          timestamp: new Date(),
        };

        setQuestions(prev => [newQuestion, ...prev]);
        toast.info('Question detected!', {
          description: result,
          duration: 3000,
        });

        // Speak the answer if not muted
        if (!muteAudio) {
          speakAnswer(result);
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakAnswer = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.info('Classroom helper paused');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.success('Classroom helper active - listening for questions');
    }
  }, [isListening]);

  const clearHistory = () => {
    setQuestions([]);
    setCurrentTranscript('');
    lastTranscriptRef.current = '';
    toast.success('History cleared');
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-emerald text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Classroom Helper</h1>
                <p className="text-xs text-muted-foreground">Real-time question detection</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMuteAudio(!muteAudio)}
              className={muteAudio ? 'text-muted-foreground' : ''}
            >
              {muteAudio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            {questions.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <History className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Main Control Card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-6">
              {/* Microphone Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening 
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' 
                    : 'bg-gradient-to-br from-primary to-emerald shadow-lg'
                }`}
              >
                {isListening ? (
                  <div className="flex flex-col items-center text-white">
                    <Mic className="h-12 w-12" />
                    <span className="text-xs mt-1 font-medium">Listening</span>
                  </div>
                ) : (
                  <MicOff className="h-12 w-12 text-white" />
                )}
                
                {/* Visualizer rings when listening */}
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-4 border-red-400"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="absolute inset-0 rounded-full border-4 border-red-400"
                    />
                  </>
                )}
              </motion.button>

              {/* Status */}
              <div className="text-center">
                <Badge 
                  variant={isListening ? 'destructive' : 'secondary'}
                  className="text-sm px-4 py-1"
                >
                  {isListening ? '● Listening for questions...' : '○ Click to start'}
                </Badge>
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                )}
              </div>

              {/* Current Transcript */}
              {currentTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-lg p-3 rounded-lg bg-muted text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Heard:</span> {currentTranscript}
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions History */}
        {questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Detected Questions ({questions.length})
              </h2>
            </div>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {questions.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                  >
                    <Card className="overflow-hidden">
                      <div className="flex">
                        {/* Answer Section - Highlighted */}
                        <div className="w-1/3 bg-gradient-to-br from-primary/10 to-emerald/10 p-4 flex flex-col justify-center border-r border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default" className="bg-primary">
                              Answer
                            </Badge>
                            <button
                              onClick={() => speakAnswer(item.answer)}
                              disabled={isSpeaking}
                              className="p-1 rounded hover:bg-white/50 transition-colors"
                            >
                              <Volume2 className="h-4 w-4 text-primary" />
                            </button>
                          </div>
                          <p className="text-sm font-medium text-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>

                        {/* Question Section */}
                        <div className="w-2/3 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Question</Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            "{item.question}"
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isListening && questions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Ready to Help</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Click the microphone button to start listening. I'll detect when your 
                  teacher asks a question and provide short, direct answers in real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClassroomHelper;
