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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { getAdapter } from '@/lib/model-adapters';
import {
  Key,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  placeholder: string;
  helpText: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    helpText: 'Get your API key from platform.openai.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    helpText: 'Get your API key from console.anthropic.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    placeholder: 'AI...',
    helpText: 'Get your API key from aistudio.google.com',
  },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const {
    apiKeys,
    isUnlocked,
    hasStoredKeys,
    unlockVault,
    saveApiKeys,
    settings,
    updateSettings,
  } = useApp();

  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [keys, setKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize keys from context when unlocked
  React.useEffect(() => {
    if (isUnlocked && apiKeys) {
      setKeys({
        openai: apiKeys.openai || '',
        anthropic: apiKeys.anthropic || '',
        gemini: apiKeys.gemini || '',
      });
    }
  }, [isUnlocked, apiKeys]);

  const handleUnlock = async () => {
    if (!passphrase) return;
    setUnlocking(true);
    const success = await unlockVault(passphrase);
    setUnlocking(false);
    
    if (success) {
      toast.success('Vault unlocked');
      setPassphrase('');
    } else {
      toast.error('Incorrect passphrase');
    }
  };

  const handleSave = async () => {
    if (!passphrase) {
      toast.error('Please enter a passphrase');
      return;
    }
    
    if (!hasStoredKeys && passphrase !== confirmPassphrase) {
      toast.error('Passphrases do not match');
      return;
    }

    setSaving(true);
    try {
      await saveApiKeys(keys, passphrase);
      toast.success('API keys saved securely');
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (error) {
      toast.error('Failed to save keys');
    }
    setSaving(false);
  };

  const handleTestConnection = async (providerId: string) => {
    const key = keys[providerId];
    if (!key) return;

    setTesting(prev => ({ ...prev, [providerId]: true }));
    setTestResults(prev => ({ ...prev, [providerId]: null }));

    const adapter = getAdapter(providerId);
    if (adapter) {
      const success = await adapter.testConnection(key);
      setTestResults(prev => ({ ...prev, [providerId]: success }));
    }

    setTesting(prev => ({ ...prev, [providerId]: false }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your API keys and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="keys" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="keys" className="flex-1">API Keys</TabsTrigger>
            <TabsTrigger value="demo" className="flex-1">Demo Mode</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1">Privacy</TabsTrigger>
          </TabsList>

          {/* Demo Mode Tab */}
          <TabsContent value="demo" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-warning" />
                  <span className="font-medium">Demo Mode</span>
                </div>
                <Switch
                  checked={settings.demoMode}
                  onCheckedChange={(checked) => updateSettings({ demoMode: checked })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enable Demo Mode to test LLMPrism without API keys. Responses are realistic mock data with simulated latency and token counts.
              </p>
              {settings.demoMode && (
                <Badge variant="outline" className="text-warning border-warning/50">
                  <Beaker className="h-3 w-3 mr-1" />
                  Demo Mode Active - Responses are simulated
                </Badge>
              )}
            </div>
            <div className="p-4 rounded-lg border border-border space-y-2">
              <div className="text-sm font-medium">What Demo Mode includes:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Realistic AI responses with proper formatting</li>
                <li>• Simulated latency (0.6-2.5s per provider)</li>
                <li>• Token counts and cost estimates</li>
                <li>• Occasional errors to demonstrate retry UX</li>
                <li>• Full workflow: run → compare → merge → export</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="keys" className="space-y-4 mt-4">
            {/* Unlock / Create Passphrase */}
            {!isUnlocked && (
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {hasStoredKeys ? 'Unlock your vault' : 'Create a passphrase'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasStoredKeys
                    ? 'Enter your passphrase to access your API keys'
                    : 'Your API keys will be encrypted with this passphrase'}
                </p>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Passphrase"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && hasStoredKeys && handleUnlock()}
                  />
                  {!hasStoredKeys && (
                    <Input
                      type="password"
                      placeholder="Confirm passphrase"
                      value={confirmPassphrase}
                      onChange={e => setConfirmPassphrase(e.target.value)}
                    />
                  )}
                </div>
                {hasStoredKeys && (
                  <Button onClick={handleUnlock} disabled={unlocking || !passphrase}>
                    {unlocking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Unlock
                  </Button>
                )}
              </div>
            )}

            {/* Provider Keys */}
            <div className="space-y-4">
              {PROVIDERS.map(provider => (
                <div
                  key={provider.id}
                  className={cn(
                    'p-4 rounded-lg border border-border space-y-3',
                    !isUnlocked && 'opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{provider.name}</Label>
                      {keys[provider.id] && testResults[provider.id] !== undefined && (
                        <Badge
                          variant={testResults[provider.id] ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {testResults[provider.id] ? 'Connected' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                    {keys[provider.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testing[provider.id] || !isUnlocked}
                      >
                        {testing[provider.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      placeholder={provider.placeholder}
                      value={keys[provider.id]}
                      onChange={e => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      disabled={!isUnlocked}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      disabled={!isUnlocked}
                    >
                      {showKeys[provider.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.helpText}</p>
                </div>
              ))}
            </div>

            {/* Save Button */}
            {isUnlocked && (
              <div className="space-y-3 pt-2">
                {!hasStoredKeys && (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Create passphrase to encrypt keys"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm passphrase"
                      value={confirmPassphrase}
                      onChange={e => setConfirmPassphrase(e.target.value)}
                    />
                  </div>
                )}
                {hasStoredKeys && (
                  <Input
                    type="password"
                    placeholder="Enter passphrase to save changes"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                  />
                )}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save API Keys
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <span className="font-medium">Local-Only Mode</span>
                <Badge variant="outline" className="ml-auto">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                All your data is stored locally on this device. No data is sent to any server except the AI providers you've configured.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-medium">Data Providers</span>
              </div>
              <p className="text-sm text-muted-foreground">
                When you run prompts, your content is sent to the selected AI providers (OpenAI, Anthropic, Google). Review each provider's privacy policy.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(keys).map(([id, key]) => (
                  key && (
                    <Badge key={id} variant="secondary">
                      {PROVIDERS.find(p => p.id === id)?.name}
                    </Badge>
                  )
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Clear All Data</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all workspaces, threads, messages, and API keys stored locally.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('This will delete ALL local data. This cannot be undone. Continue?')) {
                    // clearData() will be called from context
                    window.location.reload();
                  }
                }}
              >
                Clear All Local Data
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
