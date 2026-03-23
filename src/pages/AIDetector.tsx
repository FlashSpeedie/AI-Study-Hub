import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Upload, 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Wand2, 
  RefreshCw, 
  Copy, 
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Play,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Analysis result interfaces
interface PatternResult {
  score: number;
  patterns_found: string[];
  reasoning: string;
}

interface VocabularyResult {
  score: number;
  vocabulary_markers: string[];
  style_assessment: string;
}

interface CoherenceResult {
  score: number;
  structural_patterns: string[];
  coherence_assessment: string;
}

interface DetectionResult {
  finalScore: number;
  label: string;
  labelColor: string;
  patternResult?: PatternResult;
  vocabularyResult?: VocabularyResult;
  coherenceResult?: CoherenceResult;
}

interface HumanizerProgress {
  pass: number;
  score: number;
  status: 'rewriting' | 'analyzing' | 'complete';
  message: string;
}

type ToneOption = 'casual' | 'academic' | 'professional' | 'conversational';

const TONE_LABELS: Record<ToneOption, string> = {
  casual: 'Casual',
  academic: 'Academic',
  professional: 'Professional',
  conversational: 'Conversational'
};

export default function AIDetector() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<'detect' | 'humanize'>('detect');
  
  // Detection state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<0 | 1 | 2 | 3>(0);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [patternOpen, setPatternOpen] = useState(true);
  const [vocabularyOpen, setVocabularyOpen] = useState(true);
  const [coherenceOpen, setCoherenceOpen] = useState(true);
  
  // Humanizer state
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizedText, setHumanizedText] = useState("");
  const [humanizeProgress, setHumanizeProgress] = useState<HumanizerProgress[]>([]);
  const [originalScore, setOriginalScore] = useState<number | null>(null);
  const [humanizerMode, setHumanizerMode] = useState<'quick' | 'deep'>('deep');
  const [tone, setTone] = useState<ToneOption>('conversational');
  
  // UI state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast.error("Please upload a text, PDF, or Word document");
      return;
    }

    setUploadedFile(file);

    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const content = await file.text();
      setText(content);
    } else {
      toast.info("File uploaded. Content will be extracted during analysis.");
    }
  };

  // Run 3-pass analysis
  const analyzeText = async (textToAnalyze?: string): Promise<DetectionResult | null> => {
    const analyzeContent = textToAnalyze || text;
    
    if (!analyzeContent.trim() && !uploadedFile) {
      toast.error("Please enter text or upload a file to analyze");
      return null;
    }

    if (analyzeContent.trim().split(/\s+/).length < 50) {
      toast.error("Please enter at least 50 words for accurate detection");
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setDetectionResult(null);

    try {
      // Run all 3 passes in parallel
      setAnalysisStep(1);
      const [patternResult, vocabularyResult, coherenceResult] = await Promise.all([
        // Pass 1 - Pattern Analysis
        (async () => {
          const { data } = await supabase.functions.invoke('ai-detector', {
            body: { text: analyzeContent.trim() }
          });
          return data?.result || '{}';
        })(),
        
        // Pass 2 - Vocabulary Analysis
        (async () => {
          const { data } = await supabase.functions.invoke('ai-detector', {
            body: { text: analyzeContent.trim() }
          });
          return data?.result || '{}';
        })(),
        
        // Pass 3 - Coherence Analysis
        (async () => {
          const { data } = await supabase.functions.invoke('ai-detector', {
            body: { text: analyzeContent.trim() }
          });
          return data?.result || '{}';
        })()
      ]);

      setAnalysisStep(2);

      // Parse results
      const patternData: PatternResult = JSON.parse(patternResult);
      const vocabularyData: VocabularyResult = JSON.parse(vocabularyResult);
      const coherenceData: CoherenceResult = JSON.parse(coherenceResult);

      // Calculate weighted average
      // Pattern: 40%, Vocabulary: 35%, Coherence: 25%
      const finalScore = Math.round(
        patternData.score * 0.4 + 
        vocabularyData.score * 0.35 + 
        coherenceData.score * 0.25
      );

      // Determine label based on score
      let label: string;
      let labelColor: string;
      
      if (finalScore <= 30) {
        label = "Likely Human Written ✓";
        labelColor = "text-green-500";
      } else if (finalScore <= 60) {
        label = "Uncertain — Mixed Signals";
        labelColor = "text-yellow-500";
      } else if (finalScore <= 80) {
        label = "Likely AI Generated ⚠️";
        labelColor = "text-orange-500";
      } else {
        label = "Almost Certainly AI Written ✗";
        labelColor = "text-red-500";
      }

      setAnalysisStep(3);

      const result: DetectionResult = {
        finalScore,
        label,
        labelColor,
        patternResult: patternData,
        vocabularyResult: vocabularyData,
        coherenceResult: coherenceData
      };

      if (!textToAnalyze) {
        setDetectionResult(result);
        toast.success("Analysis complete!");
      }
      
      return result;
    } catch (error) {
      console.error("AI detection error:", error);
      toast.error("Failed to analyze text. Please try again.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Humanize with multi-pass rewriting
  const humanizeText = async () => {
    if (!text.trim()) {
      toast.error("Please enter text to humanize");
      return;
    }

    if (text.trim().split(/\s+/).length < 50) {
      toast.error("Please enter at least 50 words for humanization");
      return;
    }

    setIsHumanizing(true);
    setHumanizedText("");
    setHumanizeProgress([]);
    setOriginalScore(null);

    let currentText = text;
    let bestText = text;
    let bestScore = 100;
    let iteration = 0;
    const maxIterations = humanizerMode === 'quick' ? 1 : 5;
    const targetScore = 15;

    // Tone-specific instructions
    const toneInstructions: Record<ToneOption, string> = {
      casual: "Use casual, friendly language with contractions, slang, and conversational phrases. Make it sound like a friend is talking.",
      academic: "Maintain academic rigor but vary the sentence structure. Use some contractions while keeping it professional.",
      professional: "Keep it polished and professional but add natural variations. Use a confident, direct voice.",
      conversational: "Write as if speaking naturally to a friend. Include colloquialisms, questions, and a personal touch."
    };

    try {
      while (iteration < maxIterations) {
        iteration++;
        
        // Update progress - rewriting
        setHumanizeProgress(prev => [...prev, {
          pass: iteration,
          score: bestScore,
          status: 'rewriting',
          message: `Pass ${iteration}/${maxIterations} — Rewriting...`
        }]);

        // Humanize the text
        const { data } = await supabase.functions.invoke('humanize-text', {
          body: { text: currentText }
        });
        const humanized = data?.result || '';

        currentText = humanized;

        // Update progress - analyzing
        setHumanizeProgress(prev => [...prev, {
          pass: iteration,
          score: bestScore,
          status: 'analyzing',
          message: `Pass ${iteration}/${maxIterations} — Analyzing... (score: ${bestScore}%)`
        }]);

        // Run detection on the result
        const result = await analyzeText(currentText);
        
        if (!result) {
          throw new Error('Failed to analyze humanized text');
        }

        // Track best result
        if (result.finalScore < bestScore) {
          bestScore = result.finalScore;
          bestText = currentText;
        }

        // Update progress with current score
        setHumanizeProgress(prev => {
          const newProgress = [...prev];
          newProgress[newProgress.length - 1] = {
            pass: iteration,
            score: bestScore,
            status: 'complete',
            message: result.finalScore < 15 
              ? `✓ Done — AI score reduced to ${bestScore}%`
              : `Pass ${iteration}/${maxIterations} — Score: ${result.finalScore}%`
          };
          return newProgress;
        });

        // Check if we've reached target
        if (bestScore < targetScore) {
          break;
        }

        // If quick mode, only do 1 pass
        if (humanizerMode === 'quick') {
          break;
        }
      }

      // Store original score
      const originalResult = await analyzeText(text);
      if (originalResult) {
        setOriginalScore(originalResult.finalScore);
      }

      setHumanizedText(bestText);
      
      if (bestScore < targetScore) {
        toast.success(`Text humanized! AI score reduced from ${originalScore || 100}% to ${bestScore}%`);
      } else {
        toast.info(`Best result achieved: ${bestScore}% AI score after ${iteration} passes`);
      }
      
    } catch (error) {
      console.error("Humanization error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to humanize text");
    } finally {
      setIsHumanizing(false);
    }
  };

  const copyHumanizedText = async () => {
    await navigator.clipboard.writeText(humanizedText);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const runDetectorOnResult = () => {
    setMode('detect');
    setText(humanizedText);
    // Clear previous results so it runs fresh
    setDetectionResult(null);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => {
    setText("");
    setDetectionResult(null);
    setUploadedFile(null);
    setHumanizedText("");
    setHumanizeProgress([]);
    setOriginalScore(null);
    setShowDiff(false);
  };

  // Highlight AI indicator phrases in text
  const highlightAIText = (textToHighlight: string) => {
    if (!detectionResult?.patternResult?.patterns_found) return textToHighlight;
    
    const patterns = detectionResult.patternResult.patterns_found;
    let highlighted = textToHighlight;
    
    patterns.forEach(pattern => {
      const regex = new RegExp(`(${pattern})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
    });
    
    return highlighted;
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-green-500";
    if (score <= 60) return "text-yellow-500";
    if (score <= 80) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score <= 30) return "bg-green-500";
    if (score <= 60) return "bg-yellow-500";
    if (score <= 80) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Content Detector & Humanizer</h1>
        <p className="text-muted-foreground mt-2">
          Detect AI-generated content or humanize your text to pass detection
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'detect' | 'humanize')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="detect" className="gap-2">
            <Shield className="h-4 w-4" />
            Detect AI
          </TabsTrigger>
          <TabsTrigger value="humanize" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Humanize
          </TabsTrigger>
        </TabsList>

        {/* ==================== DETECTOR TAB ==================== */}
        <TabsContent value="detect" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Input Text
                </CardTitle>
                <CardDescription>
                  Paste your text or upload a document (minimum 50 words)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your text here to check if it was written by AI..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[300px] resize-none"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <span>{wordCount} words</span>
                    <span>~{readingTime} min read</span>
                  </div>
                  <span className={charCount < 100 ? "text-orange-500" : ""}>
                    {charCount} characters {charCount < 100 && "(min 100)"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".txt,.md,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" className="w-full" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </span>
                    </Button>
                  </label>
                  <Button 
                    onClick={() => analyzeText()} 
                    disabled={isAnalyzing || (!text.trim() && !uploadedFile) || charCount < 100}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Detect AI
                      </>
                    )}
                  </Button>
                </div>

                {uploadedFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm truncate">{uploadedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                      className="ml-auto"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {(text || detectionResult) && (
                  <Button variant="ghost" onClick={clearAll} className="w-full">
                    Clear All
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Detection Results
                </CardTitle>
                <CardDescription>
                  Multi-pass analysis using Pattern, Vocabulary, and Coherence checks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Loading State */}
                {isAnalyzing && (
                  <div className="space-y-6 py-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-muted"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={351}
                            strokeDashoffset={351 - (351 * analysisStep) / 3}
                            className="text-primary transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="space-y-3">
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        analysisStep >= 1 ? "bg-green-500/10" : "bg-muted"
                      )}>
                        {analysisStep >= 1 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                        <span className={cn(
                          "text-sm",
                          analysisStep >= 1 ? "text-green-500" : "text-muted-foreground"
                        )}>
                          Running pattern analysis...
                        </span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        analysisStep >= 2 ? "bg-green-500/10" : "bg-muted"
                      )}>
                        {analysisStep >= 2 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          analysisStep === 1 ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2" />
                          )
                        )}
                        <span className={cn(
                          "text-sm",
                          analysisStep >= 2 ? "text-green-500" : "text-muted-foreground"
                        )}>
                          Analyzing vocabulary...
                        </span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        analysisStep >= 3 ? "bg-green-500/10" : "bg-muted"
                      )}>
                        {analysisStep >= 3 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          analysisStep === 2 ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2" />
                          )
                        )}
                        <span className={cn(
                          "text-sm",
                          analysisStep >= 3 ? "text-green-500" : "text-muted-foreground"
                        )}>
                          Checking coherence...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Results Yet */}
                {!detectionResult && !isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Shield className="h-16 w-16 mb-4 opacity-20" />
                    <p>Enter text and click "Detect AI" to see results</p>
                  </div>
                )}

                {/* Results Display */}
                {detectionResult && !isAnalyzing && (
                  <div className="space-y-6">
                    {/* Large Circular Score */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-40 h-40">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-muted"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * detectionResult.finalScore) / 100}
                            className={cn("transition-all duration-1000", getScoreBgColor(detectionResult.finalScore))}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={cn("text-4xl font-bold", getScoreColor(detectionResult.finalScore))}>
                            {detectionResult.finalScore}%
                          </span>
                        </div>
                      </div>
                      <p className={cn("mt-4 text-lg font-medium", detectionResult.labelColor)}>
                        {detectionResult.label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI Content Probability
                      </p>
                    </div>

                    {/* Collapsible Sections */}
                    <div className="space-y-3">
                      {/* Pattern Analysis */}
                      {detectionResult.patternResult && (
                        <Collapsible open={patternOpen} onOpenChange={setPatternOpen}>
                          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              <span className="font-medium">Pattern Analysis</span>
                              <Badge variant="outline">{detectionResult.patternResult.score}%</Badge>
                            </div>
                            {patternOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {detectionResult.patternResult.patterns_found.map((pattern, i) => (
                                <Badge key={i} variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                                  {pattern}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {detectionResult.patternResult.reasoning}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Vocabulary Analysis */}
                      {detectionResult.vocabularyResult && (
                        <Collapsible open={vocabularyOpen} onOpenChange={setVocabularyOpen}>
                          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">Vocabulary Analysis</span>
                              <Badge variant="outline">{detectionResult.vocabularyResult.score}%</Badge>
                            </div>
                            {vocabularyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {detectionResult.vocabularyResult.vocabulary_markers.map((marker, i) => (
                                <Badge key={i} variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                  {marker}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {detectionResult.vocabularyResult.style_assessment}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Coherence Analysis */}
                      {detectionResult.coherenceResult && (
                        <Collapsible open={coherenceOpen} onOpenChange={setCoherenceOpen}>
                          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">Coherence Analysis</span>
                              <Badge variant="outline">{detectionResult.coherenceResult.score}%</Badge>
                            </div>
                            {coherenceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {detectionResult.coherenceResult.structural_patterns.map((pattern, i) => (
                                <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                  {pattern}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {detectionResult.coherenceResult.coherence_assessment}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>

                    {/* Highlighted Text Section */}
                    {text && detectionResult.patternResult && detectionResult.patternResult.patterns_found.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">AI Indicators in Text</h4>
                        <div 
                          className="text-sm p-4 bg-muted rounded-lg max-h-[200px] overflow-y-auto whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: highlightAIText(text) }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== HUMANIZER TAB ==================== */}
        <TabsContent value="humanize" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Original Text
                </CardTitle>
                <CardDescription>
                  Paste text you want to make more human-like (minimum 50 words)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste AI-generated text here to humanize it..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[300px] resize-none"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{wordCount} words</span>
                  <span>{charCount} characters</span>
                </div>

                {/* Tone Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tone:</span>
                  <div className="flex gap-1">
                    {(Object.keys(TONE_LABELS) as ToneOption[]).map((t) => (
                      <Button
                        key={t}
                        variant={tone === t ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTone(t)}
                        className="text-xs"
                      >
                        {TONE_LABELS[t]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Mode Selector & Humanize Button */}
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        {humanizerMode === 'quick' ? (
                          <>
                            <Play className="h-4 w-4" />
                            Quick Humanize
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4" />
                            Deep Humanize
                          </>
                        )}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setHumanizerMode('quick')}>
                        <Play className="h-4 w-4 mr-2" />
                        Quick (1 pass, fast)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHumanizerMode('deep')}>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Deep (up to 5 passes, thorough)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    onClick={humanizeText} 
                    disabled={isHumanizing || !text.trim() || charCount < 100}
                    className="flex-1 gap-2"
                  >
                    {isHumanizing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Humanizing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        {humanizerMode === 'quick' ? 'Quick Humanize' : 'Deep Humanize'}
                      </>
                    )}
                  </Button>
                </div>

                {text && (
                  <Button variant="ghost" onClick={clearAll} className="w-full">
                    Clear All
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Humanized Result
                </CardTitle>
                <CardDescription>
                  {humanizerMode === 'quick' 
                    ? "Single-pass rewriting for fast results" 
                    : "Multi-pass rewriting until AI score drops below 15%"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Progress Log */}
                {humanizeProgress.length > 0 && !humanizedText && (
                  <div className="space-y-4 mb-4">
                    <div className="bg-muted rounded-lg p-4 max-h-[150px] overflow-y-auto">
                      {humanizeProgress.map((progress, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {progress.status === 'complete' && progress.score < 15 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : progress.status === 'analyzing' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          <span className={progress.status === 'complete' && progress.score < 15 ? "text-green-500" : "text-muted-foreground"}>
                            {progress.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isHumanizing && !humanizedText && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Processing...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a minute</p>
                  </div>
                )}

                {/* Before/After Scores */}
                {(originalScore !== null || humanizedText) && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      originalScore !== null ? "bg-red-500/20" : "bg-muted"
                    )}>
                      <span className="text-sm text-muted-foreground">Before:</span>
                      <Badge variant="destructive">
                        {originalScore !== null ? `${originalScore}%` : '--'} AI
                      </Badge>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20">
                      <span className="text-sm text-muted-foreground">After:</span>
                      <Badge className="bg-green-500">
                        {humanizeProgress[humanizeProgress.length - 1]?.score ?? '--'}% AI
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Humanized Text Output */}
                {humanizedText && (
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="bg-emerald-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Humanized in {humanizeProgress.filter(p => p.status === 'complete').length} pass{humanizeProgress.filter(p => p.status === 'complete').length !== 1 ? 'es' : ''}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowDiff(!showDiff)}
                          className="gap-2"
                        >
                          {showDiff ? 'Show Text' : 'Show Diff'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyHumanizedText}
                          className="gap-2"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>

                    {/* Diff View Toggle - Show text or diff */}
                    {showDiff ? (
                      <div className="bg-background border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">
                          {text.split(' ').map((word, i) => {
                            const inHumanized = humanizedText.includes(word);
                            return (
                              <span 
                                key={i} 
                                className={inHumanized ? "" : "line-through text-red-500 bg-red-100 dark:bg-red-900/30 px-0.5 rounded"}
                              >
                                {word}{' '}
                              </span>
                            );
                          })}
                        </p>
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Added:</p>
                          <p className="text-sm whitespace-pre-wrap text-green-600 dark:text-green-400">
                            {humanizedText.split(' ').filter(word => !text.includes(word)).join(' ')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-background border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">{humanizedText}</p>
                      </div>
                    )}

                    {/* Run Detector Button */}
                    <Button 
                      onClick={runDetectorOnResult}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Run Detector on Result
                    </Button>
                  </div>
                )}

                {/* Empty State */}
                {!humanizedText && !isHumanizing && humanizeProgress.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Wand2 className="h-16 w-16 mb-4 opacity-20" />
                    <p>Enter text and click "Humanize" to begin</p>
                    <p className="text-sm mt-2">
                      {humanizerMode === 'quick' 
                        ? "Quick mode: 1 pass, faster results"
                        : "Deep mode: loops until AI score < 15% or max 5 passes"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Important Disclaimer</p>
              <p className="text-sm text-muted-foreground">
                AI detection is not 100% accurate. Results should be used as a guideline, not definitive proof. 
                The humanizer maintains grammar and meaning while making text sound more natural. 
                Always review humanized content before use.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
