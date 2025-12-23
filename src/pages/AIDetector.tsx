import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  const analyzeText = async () => {
    if (!text.trim() && !uploadedFile) {
      toast.error("Please enter text or upload a file to analyze");
      return;
    }

    if (text.trim().split(/\s+/).length < 50) {
      toast.error("Please enter at least 50 words for accurate detection");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-detector', {
        body: { text: text.trim() }
      });

      if (error) throw error;

      setResult(data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("AI detection error:", error);
      toast.error("Failed to analyze text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
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

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'bg-green-500';
    if (score <= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const clearAll = () => {
    setText("");
    setResult(null);
    setUploadedFile(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Content Detector</h1>
        <p className="text-muted-foreground mt-2">
          Check if your text was written by AI using multiple detection algorithms
        </p>
      </div>

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
                onClick={analyzeText} 
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

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Important Disclaimer</p>
              <p className="text-sm text-muted-foreground">
                AI detection is not 100% accurate. Results should be used as a guideline, not definitive proof. 
                False positives and negatives can occur. Human review is always recommended for important decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
