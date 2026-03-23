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
  Zap,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Update current transcript display (real-time subtitles)
      setCurrentTranscript(transcript);
      setNetworkError(null); // Clear any network errors when we get results
      retryCountRef.current = 0; // Reset retry count

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Set timer to process after silence
      silenceTimerRef.current = setTimeout(() => {
        if (transcript !== lastTranscriptRef.current && transcript.trim().length > 0) {
          lastTranscriptRef.current = transcript;
          processTranscript(transcript);
          setCurrentTranscript(''); // Clear transcript after processing
        }
      }, 1500);
    };

    recognition.onerror = (event) => {
      const errorEvent = event as unknown as { error?: string };
      console.error('Speech recognition error:', errorEvent.error);
      
      if (errorEvent.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
        setIsListening(false);
        setNetworkError('Microphone access denied');
      } else if (errorEvent.error === 'network') {
        setNetworkError('Network error. Please check your internet connection.');
        toast.error('Network error. Please check your internet connection.');
        
        // Auto-retry logic
        if (isListening && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setIsRetrying(true);
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error('Retry failed:', e);
            }
            setIsRetrying(false);
          }, 2000);
        }
      } else if (errorEvent.error === 'no-speech') {
        // This is normal, just means no speech detected recently
        setNetworkError(null);
      } else {
        setNetworkError(`Speech recognition error: ${errorEvent.error}`);
      }
    };

    recognition.onend = () => {
      // Only restart if we're still supposed to be listening
      // and we haven't exceeded max retries for network errors
      if (isListening) {
        if (networkError && retryCountRef.current >= maxRetries) {
          setIsListening(false);
          toast.error('Speech recognition failed after multiple attempts. Please check your connection.');
          return;
        }
        
        // Small delay before restarting to avoid rapid restart loops
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isListening, networkError]);

  const processTranscript = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      const historyContext = questions.slice(0, 5).map(q => `Q: ${q.question} A: ${q.answer}`).join('\n');
      
      const { data, error } = await supabase.functions.invoke('classroom-helper', {
        body: { 
          question: transcript,
          context: historyContext
        }
      });

      if (error) throw error;
      const reply = data?.result;

      const result = (reply || '').trim();
      const isQuestion = result !== 'NQA' && result.length > 0;

      if (isQuestion && result && result !== 'NQA') {
        const newQuestion: QuestionEvent = {
          id: Date.now().toString(),
          question: transcript,
          answer: result,
          timestamp: new Date(),
        };

        setQuestions(prev => [newQuestion, ...prev]);
        toast.info('Question detected!', {
          description: result,
          duration: 4000,
        });

        // Speak the answer if not muted
        if (!muteAudio) {
          speakAnswer(result);
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast.error('Failed to get answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakAnswer = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    
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
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      setIsListening(false);
      setNetworkError(null);
      retryCountRef.current = 0;
      toast.info('Classroom helper paused');
    } else {
      retryCountRef.current = 0;
      setNetworkError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Classroom helper active - listening for questions');
      } catch (e) {
        console.error('Failed to start recognition:', e);
        toast.error('Failed to start listening. Please try again.');
      }
    }
  }, [isListening]);

  const clearHistory = () => {
    setQuestions([]);
    setCurrentTranscript('');
    lastTranscriptRef.current = '';
    toast.success('History cleared');
  };

  const manualRetry = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setNetworkError(null);
        retryCountRef.current = 0;
        toast.success('Retrying connection...');
      } catch (e) {
        toast.error('Failed to retry. Please click the microphone button.');
      }
    }
  };

  // Get the latest answer
  const latestAnswer = questions.length > 0 ? questions[0].answer : null;
  const latestQuestion = questions.length > 0 ? questions[0].question : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4 gap-4">
        
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
                {isRetrying && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm text-amber-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Retrying connection...
                  </div>
                )}
              </div>

              {/* Network Error Display */}
              {networkError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-lg p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-200">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm font-medium">{networkError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={manualRetry}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subtitle Display (Bottom) */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardContent className="py-4">
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                <Wifi className="h-3 w-3 mr-1" />
                Live Subtitles
              </Badge>
              {currentTranscript ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg text-foreground italic min-h-[2rem]"
                >
                  "{currentTranscript}"
                </motion.p>
              ) : (
                <p className="text-sm text-muted-foreground min-h-[2rem]">
                  {isListening ? 'Listening...' : 'Click the microphone to start'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Answer Display */}
        <Card className="border-2 border-emerald/20 bg-emerald/5">
          <CardContent className="py-4">
            <div className="text-center">
              <Badge variant="default" className="mb-2 bg-emerald-600">
                <Zap className="h-3 w-3 mr-1" />
                Answer
              </Badge>
              {latestAnswer ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-xl font-semibold text-foreground min-h-[2rem]">
                    {latestAnswer}
                  </p>
                  {latestQuestion && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      Question: "{latestQuestion}"
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speakAnswer(latestAnswer)}
                      disabled={isSpeaking}
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      {isSpeaking ? 'Speaking...' : 'Play Answer'}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground min-h-[2rem]">
                  {isListening ? 'Waiting for questions...' : 'Start listening to see answers'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions History */}
        {questions.length > 1 && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Previous Questions ({questions.length - 1})
              </h2>
            </div>

            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {questions.slice(1).map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                  >
                    <Card className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {item.timestamp.toLocaleTimeString()}
                          </Badge>
                          <button
                            onClick={() => speakAnswer(item.answer)}
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Volume2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          "{item.question}"
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {item.answer}
                        </p>
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
