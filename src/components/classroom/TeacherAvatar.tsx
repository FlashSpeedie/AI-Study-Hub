import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff } from 'lucide-react';

interface TeacherAvatarProps {
  isSpeaking: boolean;
  mood?: 'neutral' | 'happy' | 'thinking';
  isActive?: boolean;
}

export const TeacherAvatar = ({ isSpeaking, mood = 'neutral', isActive = true }: TeacherAvatarProps) => {
  const [mouthFrame, setMouthFrame] = useState(0);
  const [blinkState, setBlinkState] = useState(false);

  // Mouth animation for speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setMouthFrame(prev => (prev + 1) % 4);
    }, 150);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const mouthPaths = [
    'M 85 130 Q 100 130 115 130', // closed
    'M 85 128 Q 100 136 115 128', // slightly open
    'M 85 126 Q 100 142 115 126', // open
    'M 85 128 Q 100 138 115 128', // mid
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-accent/30 rounded-xl overflow-hidden">
      {/* Video frame effect */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 z-20">
        <motion.div
          className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald' : 'bg-muted-foreground'}`}
          animate={isActive ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-xs font-medium text-foreground">
          {isActive ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Subtle animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald/5"
        animate={{
          opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.3,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Professor Avatar */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-48 h-48 lg:w-56 lg:h-56 relative z-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          y: isSpeaking ? [0, -2, 0] : 0,
        }}
        transition={{ 
          scale: { duration: 0.5 },
          y: { duration: 0.5, repeat: isSpeaking ? Infinity : 0 }
        }}
      >
        {/* Body/Shoulders */}
        <ellipse
          cx="100"
          cy="185"
          rx="55"
          ry="25"
          fill="hsl(var(--primary))"
        />
        
        {/* Neck */}
        <rect
          x="88"
          y="150"
          width="24"
          height="20"
          fill="#e8c4a8"
        />

        {/* Head */}
        <motion.ellipse
          cx="100"
          cy="95"
          rx="55"
          ry="65"
          fill="url(#skinGradientLight)"
          animate={{ 
            scale: isSpeaking ? [1, 1.01, 1] : 1,
          }}
          transition={{ duration: 0.3, repeat: isSpeaking ? Infinity : 0 }}
        />

        {/* Hair */}
        <path
          d="M 45 80 Q 45 25 100 25 Q 155 25 155 80 Q 150 70 100 55 Q 50 70 45 80 Z"
          fill="hsl(222 30% 25%)"
        />
        <path
          d="M 48 85 Q 55 75 65 80"
          stroke="hsl(222 30% 20%)"
          strokeWidth="3"
          fill="none"
        />

        {/* Ears */}
        <ellipse cx="45" cy="95" rx="8" ry="12" fill="#e8c4a8" />
        <ellipse cx="155" cy="95" rx="8" ry="12" fill="#e8c4a8" />

        {/* Glasses frame */}
        <rect x="55" y="80" width="35" height="28" rx="6" fill="none" stroke="hsl(222 30% 30%)" strokeWidth="2.5" />
        <rect x="110" y="80" width="35" height="28" rx="6" fill="none" stroke="hsl(222 30% 30%)" strokeWidth="2.5" />
        <path d="M 90 94 Q 100 90 110 94" stroke="hsl(222 30% 30%)" strokeWidth="2.5" fill="none" />
        <line x1="55" y1="94" x2="45" y2="92" stroke="hsl(222 30% 30%)" strokeWidth="2" />
        <line x1="145" y1="94" x2="155" y2="92" stroke="hsl(222 30% 30%)" strokeWidth="2" />

        {/* Eyes */}
        <g>
          <ellipse cx="72" cy="94" rx="10" ry={blinkState ? 1 : 12} fill="white" />
          <ellipse cx="128" cy="94" rx="10" ry={blinkState ? 1 : 12} fill="white" />
          {!blinkState && (
            <>
              <motion.circle
                cx="72"
                cy="94"
                r="5"
                fill="hsl(222 40% 30%)"
                animate={{ 
                  cx: mood === 'thinking' ? 75 : 72,
                  cy: mood === 'thinking' ? 92 : 94,
                }}
              />
              <motion.circle
                cx="128"
                cy="94"
                r="5"
                fill="hsl(222 40% 30%)"
                animate={{ 
                  cx: mood === 'thinking' ? 131 : 128,
                  cy: mood === 'thinking' ? 92 : 94,
                }}
              />
              <circle cx="70" cy="92" r="2" fill="white" />
              <circle cx="126" cy="92" r="2" fill="white" />
            </>
          )}
        </g>

        {/* Eyebrows */}
        <motion.path
          d="M 58 72 Q 72 68 86 72"
          stroke="hsl(222 30% 25%)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          animate={{ 
            d: mood === 'thinking' 
              ? 'M 58 68 Q 72 64 86 72' 
              : mood === 'happy'
                ? 'M 58 74 Q 72 70 86 74'
                : 'M 58 72 Q 72 68 86 72'
          }}
        />
        <motion.path
          d="M 114 72 Q 128 68 142 72"
          stroke="hsl(222 30% 25%)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          animate={{ 
            d: mood === 'thinking' 
              ? 'M 114 72 Q 128 64 142 68' 
              : mood === 'happy'
                ? 'M 114 74 Q 128 70 142 74'
                : 'M 114 72 Q 128 68 142 72'
          }}
        />

        {/* Nose */}
        <path
          d="M 100 100 L 94 118 Q 100 122 106 118 Z"
          fill="#d4a574"
          opacity="0.6"
        />

        {/* Mouth */}
        <motion.path
          d={mouthPaths[mouthFrame]}
          stroke="hsl(0 60% 45%)"
          strokeWidth="3"
          fill={mouthFrame > 1 ? "hsl(0 40% 35%)" : "none"}
          strokeLinecap="round"
        />

        {/* Smile lines when happy */}
        {mood === 'happy' && (
          <>
            <path d="M 70 120 Q 65 115 62 118" stroke="#d4a574" strokeWidth="1.5" fill="none" opacity="0.5" />
            <path d="M 130 120 Q 135 115 138 118" stroke="#d4a574" strokeWidth="1.5" fill="none" opacity="0.5" />
          </>
        )}

        {/* Collar/Shirt */}
        <path
          d="M 60 165 L 75 152 L 100 158 L 125 152 L 140 165"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="skinGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5dcc5" />
            <stop offset="100%" stopColor="#e8c4a8" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 z-20">
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{ height: [8, 16, 8] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">Speaking</span>
        </div>
      )}

      {/* Thinking indicator */}
      {mood === 'thinking' && !isSpeaking && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </motion.div>
          <span className="text-xs font-medium text-foreground">Thinking...</span>
        </div>
      )}
    </div>
  );
};
