import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useSelfCheck, CheckResult } from '@/hooks/useSelfCheck';
import { Check, X, Loader2, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelfCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CheckRow({ result }: { result: CheckResult }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border',
      result.status === 'pass' && 'border-success/30 bg-success/5',
      result.status === 'fail' && 'border-destructive/30 bg-destructive/5',
      result.status === 'pending' && 'border-border bg-muted/30',
      result.status === 'running' && 'border-primary/30 bg-primary/5',
    )}>
      <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
        {result.status === 'pending' && (
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
        )}
        {result.status === 'running' && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {result.status === 'pass' && (
          <Check className="h-4 w-4 text-success" />
        )}
        {result.status === 'fail' && (
          <X className="h-4 w-4 text-destructive" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{result.name}</div>
        {result.message && (
          <div className="text-xs text-muted-foreground truncate">{result.message}</div>
        )}
      </div>
      {result.duration !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {result.duration}ms
        </div>
      )}
    </div>
  );
}

export function SelfCheckDialog({ open, onOpenChange }: SelfCheckDialogProps) {
  const { createWorkspace, createThread, addMessage } = useApp();
  const { results, isRunning, runChecks } = useSelfCheck();

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const totalCount = results.length;

  const handleRun = () => {
    runChecks(createWorkspace, createThread, addMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Self-Check
          </DialogTitle>
          <DialogDescription>
            Automated QA verification for core functionality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-4">
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Click "Run Checks" to start verification
            </div>
          ) : (
            results.map((result, index) => (
              <CheckRow key={index} result={result} />
            ))
          )}
        </div>

        {results.length > 0 && !isRunning && (
          <div className={cn(
            'p-3 rounded-lg text-sm font-medium text-center',
            failCount === 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            {failCount === 0 
              ? `✓ All ${totalCount} checks passed` 
              : `${passCount}/${totalCount} passed, ${failCount} failed`
            }
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Checks
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
