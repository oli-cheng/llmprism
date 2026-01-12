import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Key, 
  Layers, 
  Zap, 
  GitBranch,
  Database,
  Lock,
  Cpu,
  ArrowRight,
} from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIGHLIGHTS = [
  {
    icon: Database,
    title: 'Local-First Storage',
    description: 'All data persisted in localStorage. Zero server dependencies. Works offline.',
  },
  {
    icon: Lock,
    title: 'Encrypted Key Vault',
    description: 'API keys encrypted with AES-256-GCM using Web Crypto API. Passphrase never stored.',
  },
  {
    icon: Layers,
    title: 'Provider Adapter Pattern',
    description: 'Unified interface for OpenAI, Anthropic, Gemini. Easy to extend with new providers.',
  },
  {
    icon: Zap,
    title: 'Concurrent Multi-Run',
    description: 'Promise.all with per-provider AbortController. Partial results preserved on cancel.',
  },
  {
    icon: GitBranch,
    title: 'Routing Rules Engine',
    description: 'JSON-validated rules with condition matching. Simulation before execution.',
  },
  {
    icon: Shield,
    title: 'Privacy by Design',
    description: 'No telemetry. No analytics. Data only sent to providers you configure.',
  },
];

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            LLMPrism
          </DialogTitle>
          <DialogDescription>
            A privacy-first, multi-model AI client for power users
          </DialogDescription>
        </DialogHeader>

        {/* Architecture Diagram */}
        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-3">ARCHITECTURE</div>
          <div className="flex items-center justify-center gap-2 text-xs font-mono">
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-2 rounded bg-primary/20 border border-primary/40 text-primary">
                React UI
              </div>
              <span className="text-muted-foreground">Components</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-2 rounded bg-secondary border border-border">
                AppContext
              </div>
              <span className="text-muted-foreground">State</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-2 rounded bg-secondary border border-border">
                Adapters
              </div>
              <span className="text-muted-foreground">Normalize</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                <div className="px-2 py-2 rounded provider-openai text-[10px]">OAI</div>
                <div className="px-2 py-2 rounded provider-anthropic text-[10px]">ANT</div>
                <div className="px-2 py-2 rounded provider-gemini text-[10px]">GEM</div>
              </div>
              <span className="text-muted-foreground">APIs</span>
            </div>
          </div>
          
          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Key className="h-3 w-3" />
                <span>Encrypted localStorage</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                <span>Web Crypto API</span>
              </div>
            </div>
          </div>
        </div>

        {/* Engineering Highlights */}
        <div className="mt-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">ENGINEERING HIGHLIGHTS</div>
          <div className="grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          <Badge variant="outline">React 18</Badge>
          <Badge variant="outline">TypeScript</Badge>
          <Badge variant="outline">Tailwind CSS</Badge>
          <Badge variant="outline">Radix UI</Badge>
          <Badge variant="outline">Vite</Badge>
          <Badge variant="outline">Web Crypto API</Badge>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-4">
          Built as a portfolio demonstration • No external dependencies for core functionality
        </div>
      </DialogContent>
    </Dialog>
  );
}
