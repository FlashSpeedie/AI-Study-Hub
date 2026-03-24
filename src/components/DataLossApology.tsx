import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";

// Global state for showing the dialog from anywhere
let globalShowApology: ((onRecover?: () => void) => void) | null = null;

export function showDataLossApology(onRecover?: () => void) {
  if (globalShowApology) {
    globalShowApology(onRecover);
  }
}

interface DataLossApologyProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRecoverData?: () => void;
}

export function DataLossApology({
  open: controlledOpen,
  onOpenChange,
  onRecoverData,
}: DataLossApologyProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled open if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  // Auto-show the dialog when data loss is detected (can be triggered externally)
  useEffect(() => {
    // This component can be controlled externally or triggered via the exported function
  }, []);

  const handleRecover = () => {
    if (onRecoverData) {
      onRecoverData();
    }
    handleOpenChange(false);
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">
              We're Sorry About Your Data
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-4">
            We sincerely apologize for the inconvenience. It looks like some of your data 
            didn't load properly or was lost during a recent sync.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
          <Database className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            We sincerely apologize for any data loss you may have experienced.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Dismiss
          </Button>
          {/* <Button onClick={handleRecover} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export a function to show the apology dialog from anywhere in the app
export function useDataLossApology() {
  const [show, setShow] = useState(false);
  const [callback, setCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    globalShowApology = (onRecover?: () => void) => {
      if (onRecover) {
        setCallback(() => onRecover);
      }
      setShow(true);
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    setShow(open);
    if (!open) {
      setCallback(null);
    }
  };

  return {
    Component: () => (
      <DataLossApology
        open={show}
        onOpenChange={handleOpenChange}
        onRecoverData={callback || undefined}
      />
    ),
    showApology: showDataLossApology,
  };
}

export default DataLossApology;
