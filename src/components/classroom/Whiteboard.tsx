import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Pen, Type, Trash2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhiteboardProps {
  content: string[];
  isDrawing: boolean;
  onClear: () => void;
}

export const Whiteboard = ({ content, isDrawing, onClear }: WhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [isUserDrawing, setIsUserDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animate content appearing line by line
  useEffect(() => {
    setDisplayedLines([]);
    const validContent = content.filter((line): line is string => typeof line === 'string' && line.length > 0);
    if (validContent.length === 0) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < validContent.length) {
        const line = validContent[currentIndex];
        if (line) {
          setDisplayedLines(prev => [...prev, line]);
        }
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [content]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsUserDrawing(true);
    lastPos.current = getCanvasCoords(e);
  }, [getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isUserDrawing || !canvasRef.current || !lastPos.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPos = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = tool === 'pen' ? 'hsl(222, 47%, 20%)' : '#f8fafc';
    ctx.lineWidth = tool === 'pen' ? 2 : 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    lastPos.current = currentPos;
  }, [isUserDrawing, tool, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    setIsUserDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDisplayedLines([]);
    onClear();
  }, [onClear]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-slate-50 to-white rounded-xl overflow-hidden border border-border shadow-sm"
    >
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex gap-1.5 bg-card/90 backdrop-blur-sm rounded-lg p-1.5 border border-border shadow-sm">
        <Button
          size="sm"
          variant={tool === 'pen' ? 'default' : 'ghost'}
          onClick={() => setTool('pen')}
          className="h-8 w-8 p-0"
        >
          <Pen className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          onClick={() => setTool('eraser')}
          className="h-8 w-8 p-0"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={clearCanvas}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas for user drawing */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* AI Content display */}
      <div className="absolute inset-0 p-6 pt-16 overflow-auto z-0 pointer-events-none">
        <div className="space-y-4 max-w-2xl">
          {displayedLines.map((line, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="font-sans"
            >
              {line.startsWith('##') ? (
                <h2 className="text-xl font-bold text-primary mb-2">
                  {line.replace(/^##\s*/, '')}
                </h2>
              ) : line.startsWith('•') || line.startsWith('-') ? (
                <p className="text-foreground pl-4 flex items-start gap-2">
                  <span className="text-primary mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{line.replace(/^[•-]\s*/, '')}</span>
                </p>
              ) : line.includes('=') ? (
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 font-mono">
                  <code className="text-primary text-lg">{line}</code>
                </div>
              ) : (
                <p className="text-foreground">{line}</p>
              )}
            </motion.div>
          ))}

          {isDrawing && (
            <motion.div
              className="flex items-center gap-2 text-primary"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">Writing...</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Branding */}
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50 z-20">
        Interactive Whiteboard
      </div>
    </div>
  );
};
