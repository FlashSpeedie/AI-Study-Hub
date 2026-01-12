import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Target, TrendingUp, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLetterGrade, getGradeColorHex } from '@/types';

const letterGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

const letterToPercent: Record<string, number> = {
  'A+': 97, 'A': 93, 'A-': 90,
  'B+': 87, 'B': 83, 'B-': 80,
  'C+': 77, 'C': 73, 'C-': 70,
  'D+': 67, 'D': 63, 'D-': 60,
  'F': 50
};

export default function FinalGradeCalculator() {
  const [currentGrade, setCurrentGrade] = useState<string>('');
  const [desiredGrade, setDesiredGrade] = useState<string>('');
  const [finalWeight, setFinalWeight] = useState<string>('');
  const [inputType, setInputType] = useState<'percentage' | 'letter'>('percentage');
  const [result, setResult] = useState<{ needed: number; possible: boolean } | null>(null);

  const parseGrade = (value: string): number => {
    if (inputType === 'letter') {
      return letterToPercent[value] || 0;
    }
    return parseFloat(value) || 0;
  };

  const calculateNeededGrade = () => {
    const current = parseGrade(currentGrade);
    const desired = parseGrade(desiredGrade);
    const weight = parseFloat(finalWeight) / 100;

    if (!current || !desired || !weight || weight <= 0 || weight > 1) {
      return;
    }

    // Formula: desired = current * (1 - weight) + final * weight
    // Solving for final: final = (desired - current * (1 - weight)) / weight
    const needed = (desired - current * (1 - weight)) / weight;
    
    setResult({
      needed: Math.round(needed * 100) / 100,
      possible: needed <= 100
    });
  };

  const resetCalculator = () => {
    setCurrentGrade('');
    setDesiredGrade('');
    setFinalWeight('');
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">Final Grade Calculator</h1>
        </motion.div>
        <p className="text-muted-foreground">
          Calculate the grade you need on your final exam to achieve your desired course grade
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calculator */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Enter Your Grades
            </h2>

            {/* Input Type Toggle */}
            <div className="mb-6">
              <Label className="mb-2 block">Grade Input Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={inputType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setInputType('percentage');
                    setCurrentGrade('');
                    setDesiredGrade('');
                    setResult(null);
                  }}
                >
                  Percentage
                </Button>
                <Button
                  variant={inputType === 'letter' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setInputType('letter');
                    setCurrentGrade('');
                    setDesiredGrade('');
                    setResult(null);
                  }}
                >
                  Letter Grade
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Grade */}
              <div>
                <Label htmlFor="current">Your Current Grade</Label>
                {inputType === 'percentage' ? (
                  <div className="relative mt-1">
                    <Input
                      id="current"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={currentGrade}
                      onChange={(e) => setCurrentGrade(e.target.value)}
                      placeholder="e.g., 85"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                ) : (
                  <Select value={currentGrade} onValueChange={setCurrentGrade}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {letterGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Desired Grade */}
              <div>
                <Label htmlFor="desired">The Grade You Want</Label>
                {inputType === 'percentage' ? (
                  <div className="relative mt-1">
                    <Input
                      id="desired"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={desiredGrade}
                      onChange={(e) => setDesiredGrade(e.target.value)}
                      placeholder="e.g., 90"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                ) : (
                  <Select value={desiredGrade} onValueChange={setDesiredGrade}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {letterGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Final Weight */}
              <div>
                <Label htmlFor="weight">Your Final Is Worth</Label>
                <div className="relative mt-1">
                  <Input
                    id="weight"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={finalWeight}
                    onChange={(e) => setFinalWeight(e.target.value)}
                    placeholder="e.g., 20"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={calculateNeededGrade} className="flex-1">
                  Calculate
                </Button>
                <Button variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Required Final Grade
            </h2>

            {result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {result.possible ? (
                  <>
                    <motion.p
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-6xl font-display font-bold mb-2"
                      style={{ color: getGradeColorHex(result.needed) }}
                    >
                      {result.needed}%
                    </motion.p>
                    <p className="text-lg text-muted-foreground mb-2">
                      {getLetterGrade(result.needed)}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      You need to score at least <strong>{result.needed}%</strong> on your final exam to achieve your desired grade.
                    </p>
                    {result.needed >= 90 && (
                      <div className="mt-4 p-3 rounded-lg bg-amber/10 text-amber text-sm">
                        ⚠️ This will require excellent preparation!
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <motion.p
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-5xl font-display font-bold mb-2 text-ruby"
                    >
                      {result.needed}%
                    </motion.p>
                    <div className="p-4 rounded-lg bg-ruby/10 text-ruby max-w-xs">
                      <p className="font-medium">Not Achievable</p>
                      <p className="text-sm mt-1">
                        Unfortunately, even with a perfect score of 100% on your final, you cannot reach your desired grade. Consider adjusting your target.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Info className="w-12 h-12 mb-4 opacity-50" />
                <p>Enter your grades and final exam weight to calculate what you need to score.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald/5 border-primary/10">
          <h3 className="font-semibold mb-3">How It Works</h3>
          <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">1. Current Grade</p>
              <p>Enter your current grade in the class before the final exam.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">2. Desired Grade</p>
              <p>Enter the final grade you want to achieve in the course.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">3. Final Weight</p>
              <p>Enter the percentage your final exam is worth of your total grade.</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
