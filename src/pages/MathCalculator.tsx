import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calculator as CalcIcon, LineChart, FunctionSquare, Delete, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

type CalcMode = 'scientific' | 'graphing';

const scientificButtons = [
  ['(', ')', 'mc', 'mr', 'm+', 'm-', 'C', '±'],
  ['sin', 'cos', 'tan', 'π', 'e', '√', 'x²', '÷'],
  ['log', 'ln', '7', '8', '9', '×', 'xʸ', '%'],
  ['1/x', 'n!', '4', '5', '6', '-', '|x|', 'mod'],
  ['EXP', 'rad', '1', '2', '3', '+', 'Ans', '='],
  ['', '', '0', '.', '', '', '', ''],
];

export default function MathCalculator() {
  const [mode, setMode] = useState<CalcMode>('scientific');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState(0);
  const [lastAnswer, setLastAnswer] = useState(0);
  const [graphExpression, setGraphExpression] = useState('x^2');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update Desmos graph when expression changes
  useEffect(() => {
    if (mode === 'graphing' && iframeRef.current) {
      // The iframe will handle the expression via URL parameter
    }
  }, [graphExpression, mode]);

  const handleButtonClick = (btn: string) => {
    if (btn === '') return;

    switch (btn) {
      case 'C':
        setDisplay('0');
        setExpression('');
        break;
      case '=':
        try {
          let evalExpr = expression || display;
          evalExpr = evalExpr
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/π/g, Math.PI.toString())
            .replace(/e(?![xp])/g, Math.E.toString())
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/√\(/g, 'Math.sqrt(')
            .replace(/x²/g, '**2')
            .replace(/xʸ/g, '**')
            .replace(/\|([^|]+)\|/g, 'Math.abs($1)')
            .replace(/(\d+)!/g, 'factorial($1)')
            .replace(/1\/\(/g, '1/(');
          
          // Simple factorial function
          const factorial = (n: number): number => {
            if (n <= 1) return 1;
            return n * factorial(n - 1);
          };
          
          // eslint-disable-next-line no-eval
          const result = eval(evalExpr);
          setDisplay(result.toString());
          setLastAnswer(result);
          setExpression('');
        } catch {
          setDisplay('Error');
        }
        break;
      case '±':
        setDisplay((prev) => (parseFloat(prev) * -1).toString());
        break;
      case 'mc':
        setMemory(0);
        break;
      case 'mr':
        setDisplay(memory.toString());
        break;
      case 'm+':
        setMemory(memory + parseFloat(display));
        break;
      case 'm-':
        setMemory(memory - parseFloat(display));
        break;
      case 'Ans':
        setDisplay(lastAnswer.toString());
        setExpression((prev) => prev + lastAnswer.toString());
        break;
      case 'sin':
      case 'cos':
      case 'tan':
      case 'log':
      case 'ln':
      case '√':
        setExpression((prev) => prev + btn + '(');
        setDisplay(btn + '(');
        break;
      case 'π':
        setExpression((prev) => prev + 'π');
        setDisplay((prev) => (prev === '0' ? 'π' : prev + 'π'));
        break;
      case 'e':
        setExpression((prev) => prev + 'e');
        setDisplay((prev) => (prev === '0' ? 'e' : prev + 'e'));
        break;
      case 'x²':
        setExpression((prev) => prev + '**2');
        setDisplay((prev) => prev + '²');
        break;
      case 'xʸ':
        setExpression((prev) => prev + '**');
        setDisplay((prev) => prev + '^');
        break;
      case '1/x':
        setExpression((prev) => '1/(' + prev + ')');
        setDisplay((prev) => '1/' + prev);
        break;
      case 'n!':
        setExpression((prev) => prev + '!');
        setDisplay((prev) => prev + '!');
        break;
      case '|x|':
        setExpression((prev) => '|' + prev + '|');
        setDisplay((prev) => '|' + prev + '|');
        break;
      case 'rad':
        // Toggle between radians and degrees would go here
        break;
      case 'EXP':
        setExpression((prev) => prev + 'e');
        setDisplay((prev) => prev + 'E');
        break;
      case 'mod':
        setExpression((prev) => prev + '%');
        setDisplay((prev) => prev + ' mod ');
        break;
      case '%':
        setExpression((prev) => '(' + prev + ')/100');
        setDisplay((prev) => prev + '%');
        break;
      default:
        if (display === '0' && btn !== '.') {
          setDisplay(btn);
          setExpression(btn);
        } else {
          setDisplay((prev) => prev + btn);
          setExpression((prev) => prev + btn);
        }
    }
  };

  const getButtonClass = (btn: string) => {
    if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(btn)) {
      return 'bg-card hover:bg-accent text-foreground';
    }
    if (['='].includes(btn)) {
      return 'bg-emerald hover:bg-emerald-light text-primary-foreground';
    }
    if (['C'].includes(btn)) {
      return 'bg-ruby/20 hover:bg-ruby/30 text-ruby';
    }
    if (['+', '-', '×', '÷', 'xʸ'].includes(btn)) {
      return 'bg-primary/10 hover:bg-primary/20 text-primary';
    }
    return 'bg-muted hover:bg-accent text-foreground';
  };

  return (
    <div className="max-w-4xl mx-auto animate-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalcIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Math Engine</h1>
        </div>
        <p className="text-muted-foreground">Scientific calculator and graphing tools</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as CalcMode)}>
        <TabsList className="mb-6">
          <TabsTrigger value="scientific" className="gap-2">
            <FunctionSquare className="w-4 h-4" />
            Scientific
          </TabsTrigger>
          <TabsTrigger value="graphing" className="gap-2">
            <LineChart className="w-4 h-4" />
            Graphing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scientific">
          <Card className="p-4 max-w-md mx-auto">
            {/* Display */}
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="text-xs text-muted-foreground h-5 text-right overflow-hidden">
                {expression}
              </div>
              <div className="text-3xl font-mono font-bold text-right overflow-x-auto">
                {display}
              </div>
            </div>

            {/* Memory indicator */}
            {memory !== 0 && (
              <div className="text-xs text-muted-foreground mb-2">
                M: {memory}
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-8 gap-1.5">
              {scientificButtons.flat().map((btn, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className={`h-12 text-sm font-medium ${getButtonClass(btn)} ${btn === '' ? 'invisible' : ''} ${btn === '0' ? 'col-span-2' : ''}`}
                  onClick={() => handleButtonClick(btn)}
                  disabled={btn === ''}
                >
                  {btn}
                </Button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="graphing">
          <Card className="p-4">
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Enter function:</label>
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground">y =</span>
                  <Input
                    value={graphExpression}
                    onChange={(e) => setGraphExpression(e.target.value)}
                    placeholder="x^2"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-muted rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe
                ref={iframeRef}
                src={`https://www.desmos.com/calculator?invertedColors=true`}
                className="w-full h-full border-0"
                title="Desmos Calculator"
                allow="clipboard-write"
              />
            </div>
            
            <div className="mt-4 p-4 bg-accent/50 rounded-lg">
              <h3 className="font-semibold mb-2">Quick Tips:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use <code className="bg-muted px-1 rounded">^</code> for exponents (e.g., x^2)</li>
                <li>• Use <code className="bg-muted px-1 rounded">sqrt(x)</code> for square roots</li>
                <li>• Use <code className="bg-muted px-1 rounded">sin(x), cos(x), tan(x)</code> for trig functions</li>
                <li>• Use <code className="bg-muted px-1 rounded">abs(x)</code> for absolute value</li>
                <li>• Use <code className="bg-muted px-1 rounded">log(x), ln(x)</code> for logarithms</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
