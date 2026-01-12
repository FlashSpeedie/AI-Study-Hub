import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, Shield, AlertTriangle, CheckCircle, XCircle, Wand2, RefreshCw, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DetectorResult {
  name: string;
  score: number;
  verdict: 'human' | 'ai' | 'mixed';
  confidence: number;
}

interface AnalysisResult {
  overallScore: number;
  verdict: string;
  detectors: DetectorResult[];
  highlights: string[];
}

export default function AIDetector() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<'detect' | 'humanize'>('detect');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [humanizedText, setHumanizedText] = useState("");
  const [humanizeIteration, setHumanizeIteration] = useState(0);
  const [humanizeProgress, setHumanizeProgress] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

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

  const analyzeText = async (textToAnalyze?: string) => {
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

    try {
      const { data, error } = await supabase.functions.invoke('ai-detector', {
        body: { text: analyzeContent.trim() }
      });

      if (error) throw error;

      if (!textToAnalyze) {
        setResult(data);
        toast.success("Analysis complete!");
      }
      
      return data as AnalysisResult;
    } catch (error) {
      console.error("AI detection error:", error);
      toast.error("Failed to analyze text. Please try again.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    setHumanizeIteration(0);
    setHumanizeProgress([]);

    let currentText = text;
    let iteration = 0;
    const maxIterations = 5;

    try {
      while (iteration < maxIterations) {
        // First, analyze the current text
        setHumanizeProgress(prev => [...prev, `Iteration ${iteration + 1}: Analyzing text...`]);
        
        const analysisResult = await analyzeText(currentText);
        
        if (!analysisResult) {
          throw new Error('Failed to analyze text');
        }

        setHumanizeProgress(prev => [...prev, `AI Score: ${analysisResult.overallScore}%`]);

        // Check if we've reached 0% AI
        if (analysisResult.overallScore <= 5) {
          setHumanizedText(currentText);
          setHumanizeIteration(iteration + 1);
          setHumanizeProgress(prev => [...prev, `✅ Success! Text is now ${100 - analysisResult.overallScore}% human-like`]);
          toast.success("Text successfully humanized!");
          break;
        }

        // Humanize the text
        setHumanizeProgress(prev => [...prev, `Rewriting to sound more human...`]);
        
        const { data, error } = await supabase.functions.invoke('humanize-text', {
          body: { 
            text: currentText, 
            currentScore: analysisResult.overallScore,
            iteration 
          }
        });

        if (error) throw error;

        if (data.error) {
          throw new Error(data.error);
        }

        currentText = data.humanizedText;
        iteration++;
        setHumanizeIteration(iteration);

        // Check if it's the last iteration
        if (iteration >= maxIterations) {
          setHumanizedText(currentText);
          setHumanizeProgress(prev => [...prev, `⚠️ Reached maximum iterations. Best result achieved.`]);
          toast.info("Maximum iterations reached. Review the result.");
        }
      }
    } catch (error) {
      console.error("Humanization error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to humanize text");
      setHumanizeProgress(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'human': return 'text-green-500';
      case 'ai': return 'text-red-500';
      case 'mixed': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'human': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ai': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'mixed': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const clearAll = () => {
    setText("");
    setResult(null);
    setUploadedFile(null);
    setHumanizedText("");
    setHumanizeIteration(0);
    setHumanizeProgress([]);
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
                  <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>{text.length} characters</span>
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
                    disabled={isAnalyzing || (!text.trim() && !uploadedFile)}
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

                {(text || result) && (
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
                  Analysis from multiple AI detection algorithms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!result && !isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Shield className="h-16 w-16 mb-4 opacity-20" />
                    <p>Enter text and click "Detect AI" to see results</p>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Running detection algorithms...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-muted rounded-lg">
                      <div className="text-4xl font-bold mb-2">
                        {result.overallScore}%
                      </div>
                      <div className={`text-lg font-medium ${getVerdictColor(result.verdict.toLowerCase())}`}>
                        {result.verdict}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        AI Content Probability
                      </p>
                    </div>

                    {/* Individual Detectors */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Detection Breakdown</h4>
                      {result.detectors.map((detector, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getVerdictIcon(detector.verdict)}
                              <span className="font-medium">{detector.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={detector.verdict === 'human' ? 'default' : detector.verdict === 'ai' ? 'destructive' : 'secondary'}>
                                {detector.score}% AI
                              </Badge>
                            </div>
                          </div>
                          <Progress 
                            value={detector.score} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            Confidence: {detector.confidence}%
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Highlights */}
                    {result.highlights && result.highlights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Analysis Notes</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {result.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                  <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>{text.length} characters</span>
                </div>

                <Button 
                  onClick={humanizeText} 
                  disabled={isHumanizing || !text.trim()}
                  className="w-full gap-2"
                >
                  {isHumanizing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Humanizing... (Iteration {humanizeIteration})
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Humanize Text
                    </>
                  )}
                </Button>

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
                  Recursively rewritten until AI detection reaches 0%
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!humanizedText && !isHumanizing && humanizeProgress.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Wand2 className="h-16 w-16 mb-4 opacity-20" />
                    <p>Enter text and click "Humanize" to begin</p>
                    <p className="text-sm mt-2">The process will iterate until AI detection is 0%</p>
                  </div>
                )}

                {/* Progress Log */}
                {humanizeProgress.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 max-h-[150px] overflow-y-auto">
                      <h4 className="font-medium mb-2 text-sm">Progress Log</h4>
                      {humanizeProgress.map((log, index) => (
                        <p key={index} className="text-xs text-muted-foreground font-mono">
                          {log}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Humanized Text Output */}
                {humanizedText && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="bg-emerald-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Humanized in {humanizeIteration} iteration{humanizeIteration !== 1 ? 's' : ''}
                      </Badge>
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
                    
                    <div className="bg-background border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{humanizedText}</p>
                    </div>
                  </div>
                )}

                {isHumanizing && !humanizedText && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Processing iteration {humanizeIteration + 1}...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a minute</p>
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
