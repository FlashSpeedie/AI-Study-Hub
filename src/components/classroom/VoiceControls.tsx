import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  textToSpeak: string | null;
  onSpeakingChange: (isSpeaking: boolean) => void;
}

export const VoiceControls = ({ onTranscript, textToSpeak, onSpeakingChange }: VoiceControlsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      const instance = new SpeechRecognitionAPI();
      instance.continuous = false;
      instance.interimResults = false;
      instance.lang = 'en-US';

      instance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      instance.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied');
        }
      };

      instance.onend = () => setIsListening(false);
      setRecognition(instance);
    }
  }, [onTranscript]);

  useEffect(() => {
    if (!textToSpeak || isMuted) return;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9;
    utterance.onstart = () => onSpeakingChange(true);
    utterance.onend = () => onSpeakingChange(false);
    speechSynthesis.speak(utterance);
    return () => speechSynthesis.cancel();
  }, [textToSpeak, isMuted, onSpeakingChange]);

  const toggleListening = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition not supported');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={toggleListening}
        variant={isListening ? 'default' : 'outline'}
        size="lg"
        className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
      >
        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        <span className="ml-2">{isListening ? 'Stop' : 'Speak'}</span>
      </Button>

      <Button
        onClick={() => { if (!isMuted) speechSynthesis.cancel(); setIsMuted(!isMuted); }}
        variant="outline"
        size="icon"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-4 bg-red-500 rounded-full"
                  animate={{ scaleY: [1, 2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span>Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
