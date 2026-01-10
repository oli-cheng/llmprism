import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApp, Preset } from '@/contexts/AppContext';
import { 
  Sparkles, 
  Code2, 
  Briefcase, 
  ArrowRight, 
  Shield,
  Zap,
  GitMerge,
  Layers,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

const PRESETS = [
  {
    id: 'research' as Preset,
    name: 'Research Desk',
    description: 'For writing, research synthesis, and analysis',
    icon: Sparkles,
    color: 'text-blue-400',
  },
  {
    id: 'code' as Preset,
    name: 'Code Bench',
    description: 'For development Q&A and code review',
    icon: Code2,
    color: 'text-green-400',
  },
  {
    id: 'operator' as Preset,
    name: 'Operator Inbox',
    description: 'For founders and PM drafts',
    icon: Briefcase,
    color: 'text-orange-400',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Multi-Model Runs',
    description: 'Run your prompt on multiple AI models simultaneously',
  },
  {
    icon: GitMerge,
    title: 'Merge Responses',
    description: 'Select text from responses and merge into your final draft',
  },
  {
    icon: Layers,
    title: 'Context Packs',
    description: 'Attach saved notes and documents to your prompts',
  },
];

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const { createWorkspace, createThread, addMessage, unlockVault, saveApiKeys } = useApp();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset>('research');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  const handleCreateWorkspace = () => {
    const name = workspaceName.trim() || 'My Workspace';
    const workspace = createWorkspace(name, selectedPreset);
    
    // Create a sample thread with demo content
    const thread = createThread('Getting Started with Prism');
    
    // Add sample messages
    addMessage({
      threadId: thread.id,
      role: 'user',
      content: 'What are the key differences between GPT-4 and Claude 3.5 Sonnet for code generation?',
    });
    
    setStep(2);
  };

  const handleSetPassphrase = async () => {
    if (passphrase !== confirmPassphrase) {
      return;
    }
    await saveApiKeys({}, passphrase);
    setStep(4);
  };

  const handleSkipPassphrase = async () => {
    await unlockVault('temp-' + Math.random().toString(36));
    setStep(4);
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" onPointerDownOutside={e => e.preventDefault()}>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="h-8 w-8 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">P</span>
                </div>
                Welcome to Prism
              </DialogTitle>
              <DialogDescription>
                Your neutral cockpit for multi-model AI workflows
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Name your first workspace
                </label>
                <Input
                  placeholder="My Workspace"
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Choose a preset
                </label>
                <div className="space-y-2">
                  {PRESETS.map(preset => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-all',
                          selectedPreset === preset.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => setSelectedPreset(preset.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('h-5 w-5', preset.color)} />
                          <div>
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {preset.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="w-full" onClick={handleCreateWorkspace}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                How Prism Works
              </DialogTitle>
              <DialogDescription>
                A quick tour of the key features
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{feature.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {feature.description}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="text-sm font-medium mb-2">Quick Demo</div>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>1. Select 2+ models using the badges below the prompt input</p>
                  <p>2. Type your prompt and press ⌘+Enter to run</p>
                  <p>3. Select text from responses and click "Insert at Cursor" to merge</p>
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Secure Your Vault
              </DialogTitle>
              <DialogDescription>
                Create a passphrase to encrypt your API keys locally
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Your API keys will be encrypted with AES-256 and stored only on this device.
                Choose a strong passphrase you'll remember.
              </p>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Create passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirm passphrase"
                  value={confirmPassphrase}
                  onChange={e => setConfirmPassphrase(e.target.value)}
                />
                {passphrase && confirmPassphrase && passphrase !== confirmPassphrase && (
                  <p className="text-xs text-destructive">Passphrases don't match</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipPassphrase}
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSetPassphrase}
                  disabled={!passphrase || passphrase !== confirmPassphrase}
                >
                  Set Passphrase
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                You're All Set!
              </DialogTitle>
              <DialogDescription>
                Add your API keys in Settings to start using Prism
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="text-sm font-medium">Next Steps</div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">1</div>
                    <span>Open Settings (⌘K → Settings)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">2</div>
                    <span>Add your OpenAI, Anthropic, or Gemini API keys</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">3</div>
                    <span>Start prompting across multiple models!</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">⌘K - Command Palette</Badge>
                <Badge variant="outline">⌘1/2/3 - Switch Presets</Badge>
                <Badge variant="outline">⌘↵ - Run Prompt</Badge>
              </div>

              <Button className="w-full" onClick={handleComplete}>
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
