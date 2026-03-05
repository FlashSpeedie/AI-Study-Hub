import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Atom, Shuffle, Type, MousePointer, CheckCircle, XCircle, Trophy, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Element } from '@/types';
import { periodicTableData } from '@/data/periodicTable';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  'alkali-metal': 'bg-red-500/80 hover:bg-red-500',
  'alkaline-earth-metal': 'bg-orange-500/80 hover:bg-orange-500',
  'transition-metal': 'bg-yellow-500/80 hover:bg-yellow-500',
  'post-transition-metal': 'bg-green-500/80 hover:bg-green-500',
  'metalloid': 'bg-teal-500/80 hover:bg-teal-500',
  'nonmetal': 'bg-cyan-500/80 hover:bg-cyan-500',
  'halogen': 'bg-blue-500/80 hover:bg-blue-500',
  'noble-gas': 'bg-purple-500/80 hover:bg-purple-500',
  'lanthanide': 'bg-pink-500/80 hover:bg-pink-500',
  'actinide': 'bg-rose-500/80 hover:bg-rose-500',
  'unknown': 'bg-gray-500/80 hover:bg-gray-500',
};

const categoryLabels: Record<string, string> = {
  'alkali-metal': 'Alkali Metal',
  'alkaline-earth-metal': 'Alkaline Earth Metal',
  'transition-metal': 'Transition Metal',
  'post-transition-metal': 'Post-Transition Metal',
  'metalloid': 'Metalloid',
  'nonmetal': 'Nonmetal',
  'halogen': 'Halogen',
  'noble-gas': 'Noble Gas',
  'lanthanide': 'Lanthanide',
  'actinide': 'Actinide',
  'unknown': 'Unknown',
};

export default function PeriodicTable() {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
  // Game state
  const [gameMode, setGameMode] = useState<'none' | 'drag-drop' | 'name-to-icon' | 'icon-to-name'>('none');
  const [gameScore, setGameScore] = useState(0);
  const [gameTotal, setGameTotal] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Element | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  const [draggedElement, setDraggedElement] = useState<Element | null>(null);
  const [dropTarget, setDropTarget] = useState<{row: number, col: number} | null>(null);
  const [gameElements, setGameElements] = useState<Element[]>([]);

  const filteredElements = useMemo(() => {
    if (!searchQuery) return periodicTableData;
    const query = searchQuery.toLowerCase();
    return periodicTableData.filter(
      (el) =>
        el.name.toLowerCase().includes(query) ||
        el.symbol.toLowerCase().includes(query) ||
        el.atomicNumber.toString().includes(query)
    );
  }, [searchQuery]);

  const getElementPosition = (element: Element) => {
    // Handle lanthanides and actinides
    if (element.period === 6 && element.group === 3 && element.atomicNumber >= 57 && element.atomicNumber <= 71) {
      return { gridRow: 9, gridColumn: element.atomicNumber - 57 + 4 };
    }
    if (element.period === 7 && element.group === 3 && element.atomicNumber >= 89 && element.atomicNumber <= 103) {
      return { gridRow: 10, gridColumn: element.atomicNumber - 89 + 4 };
    }
    return { gridRow: element.period, gridColumn: element.group };
  };

  const isHighlighted = (element: Element) => {
    if (hoveredCategory) return element.category === hoveredCategory;
    if (searchQuery) return filteredElements.some(el => el.atomicNumber === element.atomicNumber);
    return true;
  };

  // Game Functions
  const startGame = (mode: 'drag-drop' | 'name-to-icon' | 'icon-to-name') => {
    setGameMode(mode);
    setGameScore(0);
    setGameTotal(0);
    setAnswerResult(null);
    setUserAnswer('');
    
    // Get random elements for the game
    const shuffled = [...periodicTableData].sort(() => Math.random() - 0.5).slice(0, 10);
    setGameElements(shuffled);
    
    if (shuffled.length > 0) {
      setCurrentQuestion(shuffled[0]);
    }
    
    toast.info(`Starting ${mode === 'drag-drop' ? 'Drag & Drop' : mode === 'name-to-icon' ? 'Name to Symbol' : 'Symbol to Name'} game!`);
  };

  const nextQuestion = () => {
    const currentIndex = gameElements.findIndex(el => el.atomicNumber === currentQuestion?.atomicNumber);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < gameElements.length) {
      setCurrentQuestion(gameElements[nextIndex]);
      setUserAnswer('');
      setAnswerResult(null);
    } else {
      // Game over
      const percentage = gameTotal > 0 ? Math.round((gameScore / gameTotal) * 100) : 0;
      toast.success(`Game Over! Score: ${gameScore}/${gameTotal} (${percentage}%)`);
      setGameMode('none');
    }
  };

  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) return;
    
    setGameTotal(prev => prev + 1);
    
    let isCorrect = false;
    
    if (gameMode === 'name-to-icon') {
      // User types the symbol
      isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.symbol.toLowerCase();
    } else if (gameMode === 'icon-to-name') {
      // User types the name
      isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.name.toLowerCase();
    }
    
    if (isCorrect) {
      setGameScore(prev => prev + 1);
      setAnswerResult('correct');
    } else {
      setAnswerResult('incorrect');
    }
    
    // Auto-advance after delay
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  const handleDragStart = (element: Element) => {
    setDraggedElement(element);
  };

  const handleDrop = (row: number, col: number) => {
    if (!draggedElement) return;
    
    const position = getElementPosition(draggedElement);
    const isCorrect = position.gridRow === row && position.gridColumn === col;
    
    setGameTotal(prev => prev + 1);
    if (isCorrect) {
      setGameScore(prev => prev + 1);
      toast.success(`Correct! ${draggedElement.name} belongs at row ${row}, col ${col}`);
    } else {
      toast.error(`Incorrect! ${draggedElement.name} belongs at row ${position.gridRow}, col ${position.gridColumn}`);
    }
    
    setDraggedElement(null);
    setDropTarget(null);
    
    // Next question
    const currentIndex = gameElements.findIndex(el => el.atomicNumber === draggedElement.atomicNumber);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < gameElements.length) {
      setCurrentQuestion(gameElements[nextIndex]);
    } else {
      const percentage = gameTotal > 0 ? Math.round((gameScore / gameTotal) * 100) : 0;
      toast.success(`Game Over! Score: ${gameScore}/${gameTotal} (${percentage}%)`);
      setGameMode('none');
    }
  };

  return (
    <div className="max-w-full mx-auto animate-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Atom className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Periodic Table</h1>
        </div>
        <p className="text-muted-foreground">Interactive periodic table of elements</p>
      </div>

      {/* Search & Game Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, symbol, or number..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={gameMode !== 'none'}
          />
        </div>
        
        {/* Game Mode Selector */}
        <div className="flex gap-2">
          {gameMode === 'none' ? (
            <>
              <Button 
                onClick={() => startGame('name-to-icon')} 
                variant="outline" 
                className="gap-2"
              >
                <Type className="w-4 h-4" />
                Name to Symbol
              </Button>
              <Button 
                onClick={() => startGame('icon-to-name')} 
                variant="outline" 
                className="gap-2"
              >
                <Type className="w-4 h-4" />
                Symbol to Name
              </Button>
            </>
          ) : (
            <>
              <Card className="px-4 py-2 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber" />
                <span className="font-semibold">Score: {gameScore}/{gameTotal}</span>
              </Card>
              <Button 
                onClick={() => setGameMode('none')} 
                variant="destructive"
              >
                End Game
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Game UI */}
      {gameMode !== 'none' && currentQuestion && (
        <Card className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-emerald/5 border-primary/20">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 text-center">
              {gameMode === 'name-to-icon' && (
                <>
                  <p className="text-lg font-medium mb-2">What is the symbol for:</p>
                  <p className="text-2xl font-bold text-primary">{currentQuestion.name}</p>
                </>
              )}
              {gameMode === 'icon-to-name' && (
                <>
                  <p className="text-lg font-medium mb-2">What element has the symbol:</p>
                  <p className="text-4xl font-bold text-primary">{currentQuestion.symbol}</p>
                </>
              )}
            </div>
            
            <div className="flex gap-2 items-center">
              <Input
                placeholder={gameMode === 'name-to-icon' ? 'Type symbol...' : 'Type name...'}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                className="w-40"
                disabled={answerResult !== null}
              />
              <Button onClick={checkAnswer} disabled={answerResult !== null}>
                Check
              </Button>
            </div>
            
            {answerResult && (
              <div className={`flex items-center gap-2 ${answerResult === 'correct' ? 'text-emerald' : 'text-ruby'}`}>
                {answerResult === 'correct' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                <span className="font-semibold">
                  {answerResult === 'correct' ? 'Correct!' : `Wrong! Answer: ${gameMode === 'name-to-icon' ? currentQuestion.symbol : currentQuestion.name}`}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all ${categoryColors[key]} ${hoveredCategory === key ? 'ring-2 ring-offset-2 ring-primary scale-105' : ''}`}
            onMouseEnter={() => setHoveredCategory(key)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Periodic Table Grid */}
      <div className="overflow-x-auto pb-4">
        <div 
          className="grid gap-1 min-w-[1100px]"
          style={{ 
            gridTemplateColumns: 'repeat(18, minmax(50px, 1fr))',
            gridTemplateRows: 'repeat(10, auto)'
          }}
        >
          {periodicTableData.map((element) => {
            const position = getElementPosition(element);
            const highlighted = isHighlighted(element);
            
            return (
              <motion.button
                key={element.atomicNumber}
                className={`p-1 rounded-md text-white transition-all ${categoryColors[element.category]} ${!highlighted ? 'opacity-30' : ''}`}
                style={{
                  gridRow: position.gridRow,
                  gridColumn: position.gridColumn,
                }}
                onClick={() => setSelectedElement(element)}
                whileHover={{ scale: 1.1, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-[10px] opacity-80">{element.atomicNumber}</div>
                <div className="text-lg font-bold leading-none">{element.symbol}</div>
                <div className="text-[8px] truncate opacity-80">{element.name}</div>
              </motion.button>
            );
          })}

          {/* Lanthanide/Actinide markers */}
          <div 
            className="text-xs text-muted-foreground flex items-center justify-center"
            style={{ gridRow: 6, gridColumn: 3 }}
          >
            57-71
          </div>
          <div 
            className="text-xs text-muted-foreground flex items-center justify-center"
            style={{ gridRow: 7, gridColumn: 3 }}
          >
            89-103
          </div>
        </div>
      </div>

      {/* Element Detail Dialog */}
      <Dialog open={!!selectedElement} onOpenChange={() => setSelectedElement(null)}>
        <DialogContent className="max-w-lg">
          {selectedElement && (
            <div className="animate-in">
              <div className="flex items-start gap-4 mb-6">
                <div 
                  className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center text-white ${categoryColors[selectedElement.category]}`}
                >
                  <span className="text-xs opacity-80">{selectedElement.atomicNumber}</span>
                  <span className="text-3xl font-bold">{selectedElement.symbol}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-display font-bold">{selectedElement.name}</h2>
                  <p className="text-muted-foreground">{categoryLabels[selectedElement.category]}</p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Atomic Mass:</span> {selectedElement.atomicMass.toFixed(4)} u
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block</span>
                    <span className="font-medium uppercase">{selectedElement.block}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Group</span>
                    <span className="font-medium">{selectedElement.group}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{selectedElement.period}</span>
                  </div>
                  {selectedElement.electronegativity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Electronegativity</span>
                      <span className="font-medium">{selectedElement.electronegativity}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedElement.meltingPoint && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Melting Point</span>
                      <span className="font-medium">{selectedElement.meltingPoint} K</span>
                    </div>
                  )}
                  {selectedElement.boilingPoint && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Boiling Point</span>
                      <span className="font-medium">{selectedElement.boilingPoint} K</span>
                    </div>
                  )}
                  {selectedElement.density && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Density</span>
                      <span className="font-medium">{selectedElement.density} g/cm³</span>
                    </div>
                  )}
                  {selectedElement.discoveryYear && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discovered</span>
                      <span className="font-medium">{selectedElement.discoveryYear}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Electron Configuration</p>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {selectedElement.electronConfiguration}
                </code>
              </div>

              {selectedElement.oxidationStates && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Oxidation States</p>
                  <p className="text-sm font-medium">{selectedElement.oxidationStates}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
