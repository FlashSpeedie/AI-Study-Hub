import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

const Maintenance = () => {
  const location = useLocation();
  const { darkMode } = useStore();

  // Extract the test path from query params or use default
  const searchParams = new URLSearchParams(location.search);
  const testPath = searchParams.get('path') || '/classroom-helper';

  useEffect(() => {
    console.log('Testing path:', testPath);
  }, [testPath]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* Icon */}
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30"
              >
                <Wrench className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </motion.div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Under Maintenance
                </h1>
                <p className="text-muted-foreground">
                  This feature is currently being developed.
                </p>
              </div>

              {/* Test Info */}
              <div className="bg-muted rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Testing Info</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  Current path: {testPath}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">Feature in development</span>
              </div>

              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">
            Dark Mode: {darkMode ? 'ON' : 'OFF'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
