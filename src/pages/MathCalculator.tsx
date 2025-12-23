import { useState } from 'react';
import { Calculator as CalcIcon, LineChart, FunctionSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CalcMode = 'scientific' | 'graphing';

export default function MathCalculator() {
  const [mode, setMode] = useState<CalcMode>('scientific');

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalcIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Math Engine</h1>
        </div>
        <p className="text-muted-foreground">Scientific calculator and graphing tools powered by Desmos</p>
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
          <Card className="overflow-hidden">
            <div style={{ height: '600px' }}>
              <iframe
                src="https://www.desmos.com/scientific"
                className="w-full h-full border-0"
                title="Desmos Scientific Calculator"
                allow="clipboard-write"
              />
            </div>
          </Card>
          <div className="mt-4 p-4 bg-accent/50 rounded-lg">
            <h3 className="font-semibold mb-2">Scientific Calculator Features:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 grid grid-cols-1 md:grid-cols-2 gap-1">
              <li>• Trigonometric functions (sin, cos, tan)</li>
              <li>• Logarithms (log, ln)</li>
              <li>• Exponents and roots</li>
              <li>• Factorial and permutations</li>
              <li>• Constants (π, e)</li>
              <li>• Memory functions</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="graphing">
          <Card className="overflow-hidden">
            <div style={{ height: '600px' }}>
              <iframe
                src="https://www.desmos.com/calculator"
                className="w-full h-full border-0"
                title="Desmos Graphing Calculator"
                allow="clipboard-write"
              />
            </div>
          </Card>
          <div className="mt-4 p-4 bg-accent/50 rounded-lg">
            <h3 className="font-semibold mb-2">Graphing Tips:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use <code className="bg-muted px-1 rounded">^</code> for exponents (e.g., x^2)</li>
              <li>• Use <code className="bg-muted px-1 rounded">sqrt(x)</code> for square roots</li>
              <li>• Use <code className="bg-muted px-1 rounded">sin(x), cos(x), tan(x)</code> for trig functions</li>
              <li>• Use <code className="bg-muted px-1 rounded">abs(x)</code> for absolute value</li>
              <li>• Use <code className="bg-muted px-1 rounded">log(x), ln(x)</code> for logarithms</li>
              <li>• Click on the graph area and use scroll to zoom</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
