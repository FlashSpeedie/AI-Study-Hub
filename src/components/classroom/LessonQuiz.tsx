import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAIResponse } from '@/lib/utils';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface LessonQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
  onSkip: () => void;
}

export const LessonQuiz = ({ questions, onComplete, onSkip }: LessonQuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    if (selectedAnswer === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
      onComplete(score + (selectedAnswer === currentQuestion.correctIndex ? 1 : 0), questions.length);
    }
  };

  if (completed) {
    const finalScore = score + (selectedAnswer === currentQuestion.correctIndex ? 1 : 0);
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl border border-border p-6 text-center"
      >
        <div className="mb-4">
          <Trophy className={`h-16 w-16 mx-auto ${percentage >= 70 ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Quiz Complete!</h3>
        <p className="text-3xl font-bold text-primary mb-2">
          {finalScore}/{questions.length}
        </p>
        <p className="text-muted-foreground mb-4">
          {percentage >= 90 ? 'Excellent work!' : 
           percentage >= 70 ? 'Good job!' : 
           percentage >= 50 ? 'Keep practicing!' : 
           'Review the material and try again!'}
        </p>
        <Button onClick={() => onComplete(finalScore, questions.length)}>
          Continue Lesson
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Quick Check</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <div className="p-5">
        <p className="text-foreground font-medium mb-4">{formatAIResponse(currentQuestion.question)}</p>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showCorrectness = showResult;

            return (
              <motion.button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                whileTap={{ scale: showResult ? 1 : 0.98 }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  showCorrectness
                    ? isCorrect
                      ? 'border-emerald bg-emerald/5'
                      : isSelected
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border'
                    : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                }`}
                disabled={showResult}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                  showCorrectness
                    ? isCorrect
                      ? 'border-emerald bg-emerald text-white'
                      : isSelected
                        ? 'border-destructive bg-destructive text-white'
                        : 'border-muted-foreground/30'
                    : isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="flex-1 text-sm">{formatAIResponse(option)}</span>
                <AnimatePresence>
                  {showCorrectness && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald" />
                      ) : isSelected ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-muted/50 rounded-lg"
            >
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Explanation: </span>
                {formatAIResponse(currentQuestion.explanation)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip Quiz
          </Button>
          {!showResult ? (
            <Button 
              onClick={handleSubmitAnswer} 
              disabled={selectedAnswer === null}
              className="flex-1"
            >
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="flex-1">
              {currentIndex < questions.length - 1 ? (
                <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : (
                'Finish Quiz'
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
