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
import { useApp, Preset } from '@/contexts/AppContext';
import { Sparkles, Code2, Briefcase, ArrowRight, Shield } from 'lucide-react';
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

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const { createWorkspace, unlockVault, saveApiKeys } = useApp();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset>('research');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  const handleCreateWorkspace = () => {
    const name = workspaceName.trim() || 'My Workspace';
    createWorkspace(name, selectedPreset);
    setStep(2);
  };

  const handleSetPassphrase = async () => {
    if (passphrase !== confirmPassphrase) {
      return;
    }
    await saveApiKeys({}, passphrase);
    onComplete();
  };

  const handleSkipPassphrase = async () => {
    // Create empty vault with a random passphrase (user will set their own later)
    await unlockVault('temp-' + Math.random().toString(36));
    onComplete();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={e => e.preventDefault()}>
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
      </DialogContent>
    </Dialog>
  );
}
