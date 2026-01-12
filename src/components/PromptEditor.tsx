import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp, Preset } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  ChevronDown,
  Settings2,
  Sparkles,
  Code2,
  Briefcase,
  Loader2,
  AlertCircle,
  X,
  Check,
  StopCircle,
  Paperclip,
  RotateCcw,
  Beaker,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelResponse } from '@/lib/model-adapters';
import { useMultiModelRun, ModelRunStatus } from '@/hooks/useMultiModelRun';
import { estimateTokens } from '@/lib/storage';
import { toast } from 'sonner';

const PRESET_CONFIG: Record<Preset, { icon: React.ElementType; label: string; color: string }> = {
  research: { icon: Sparkles, label: 'Research', color: 'text-blue-400' },
  code: { icon: Code2, label: 'Code', color: 'text-green-400' },
  operator: { icon: Briefcase, label: 'Operator', color: 'text-orange-400' },
};

interface PromptEditorProps {
  onResponses: (responses: ModelResponse[]) => void;
}

const AVAILABLE_MODELS = [
  { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai', short: 'GPT-4o' },
  { id: 'openai:gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', short: '4o-mini' },
  { id: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic', short: 'Claude' },
  { id: 'anthropic:claude-3-5-haiku-20241022', label: 'Claude Haiku', provider: 'anthropic', short: 'Haiku' },
  { id: 'gemini:gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini', short: 'Gemini' },
  { id: 'gemini:gemini-1.5-flash', label: 'Gemini Flash', provider: 'gemini', short: 'Flash' },
];

const DEMO_PROMPTS = [
  "Compare the trade-offs between React Server Components and traditional client-side rendering for a high-traffic e-commerce site.",
  "What are the key considerations when designing a multi-tenant SaaS architecture?",
  "Explain the CAP theorem and how it applies to distributed database systems.",
];

function ModelStatusIndicator({ 
  status, 
  onRetry, 
  onCancel 
}: { 
  status: ModelRunStatus; 
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs">
      <span className="font-medium capitalize">{status.provider}</span>
      {status.status === 'pending' && (
        <span className="text-muted-foreground">Waiting...</span>
      )}
      {status.status === 'running' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          {onCancel && (
            <button 
              onClick={onCancel}
              className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </>
      )}
      {status.status === 'success' && (
        <>
          <Check className="h-3 w-3 text-success" />
          {status.response?.isMock && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-warning border-warning/50">
              MOCK
            </Badge>
          )}
        </>
      )}
      {status.status === 'error' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-destructive" />
                {status.canRetry && onRetry && (
                  <button 
                    onClick={onRetry}
                    className="p-0.5 hover:bg-primary/20 rounded"
                  >
                    <RotateCcw className="h-3 w-3 text-primary" />
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{status.error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {status.status === 'cancelled' && (
        <span className="text-muted-foreground">Cancelled</span>
      )}
    </div>
  );
}

export function PromptEditor({ onResponses }: PromptEditorProps) {
  const {
    currentWorkspace,
    currentThread,
    messages,
    apiKeys,
    isUnlocked,
    preset,
    setPreset,
    addMessage,
    contextPacks,
    attachedContextPacks,
    toggleContextPackAttachment,
    settings,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(
    currentWorkspace?.defaultModels.slice(0, 2) || []
  );
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showContextPacks, setShowContextPacks] = useState(false);

  const isDemoMode = settings.demoMode;
  const canRun = isDemoMode || isUnlocked;

  // Update selected models when workspace changes
  useEffect(() => {
    if (currentWorkspace?.defaultModels) {
      setSelectedModels(currentWorkspace.defaultModels.slice(0, 2));
    }
  }, [currentWorkspace?.id]);

  const { statuses, isRunning, run, cancel, reset, retry } = useMultiModelRun({
    apiKeys: apiKeys as Record<string, string | undefined>,
    systemPrompt: currentWorkspace?.systemPrompt,
    demoMode: isDemoMode,
    onResponse: (response) => {
      if (currentThread) {
        addMessage({
          threadId: currentThread.id,
          role: 'assistant',
          provider: response.provider,
          model: response.model,
          content: response.content,
          tokenUsage: {
            prompt: response.usage.promptTokens,
            completion: response.usage.completionTokens,
            total: response.usage.totalTokens,
          },
        });
      }
    },
  });

  // Token estimation
  const tokenEstimate = useMemo(() => {
    const systemTokens = estimateTokens(currentWorkspace?.systemPrompt || '');
    const promptTokens = estimateTokens(prompt);
    const contextTokens = attachedContextPacks.reduce((acc, id) => {
      const pack = contextPacks.find(p => p.id === id);
      return acc + (pack ? estimateTokens(pack.content) : 0);
    }, 0);
    return {
      system: systemTokens,
      prompt: promptTokens,
      context: contextTokens,
      total: systemTokens + promptTokens + contextTokens,
    };
  }, [prompt, currentWorkspace?.systemPrompt, attachedContextPacks, contextPacks]);

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(m => m !== modelId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, modelId];
    });
  };

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || !currentThread || selectedModels.length === 0) return;

    // Build full prompt with context packs
    let fullPrompt = prompt.trim();
    if (attachedContextPacks.length > 0) {
      const contextContent = attachedContextPacks
        .map(id => {
          const pack = contextPacks.find(p => p.id === id);
          return pack ? `[Context: ${pack.name}]\n${pack.content}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      fullPrompt = `${contextContent}\n\n---\n\n${fullPrompt}`;
    }

    // Add user message
    addMessage({
      threadId: currentThread.id,
      role: 'user',
      content: prompt.trim(),
    });

    setLastPrompt(fullPrompt);
    const responses = await run(fullPrompt, selectedModels);
    onResponses(responses);
    setPrompt('');
  }, [prompt, currentThread, selectedModels, attachedContextPacks, contextPacks, addMessage, run, onResponses]);

  const handleRetry = useCallback(async (modelId: string) => {
    if (!lastPrompt) return;
    const response = await retry(modelId, lastPrompt);
    if (response && currentThread) {
      addMessage({
        threadId: currentThread.id,
        role: 'assistant',
        provider: response.provider,
        model: response.model,
        content: response.content,
        tokenUsage: {
          prompt: response.usage.promptTokens,
          completion: response.usage.completionTokens,
          total: response.usage.totalTokens,
        },
      });
      onResponses([response]);
    }
  }, [lastPrompt, retry, currentThread, addMessage, onResponses]);

  const handleQuickStart = () => {
    const demoPrompt = DEMO_PROMPTS[Math.floor(Math.random() * DEMO_PROMPTS.length)];
    setPrompt(demoPrompt);
    // Auto-select 2 models if none selected
    if (selectedModels.length === 0) {
      setSelectedModels(['openai:gpt-4o', 'anthropic:claude-3-5-sonnet-20241022']);
    }
    toast.info('Demo prompt loaded! Click Run to compare models.');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const PresetIcon = PRESET_CONFIG[preset].icon;

  const runningCount = statuses.filter(s => s.status === 'running' || s.status === 'pending').length;
  const progressPercent = statuses.length > 0 
    ? ((statuses.length - runningCount) / statuses.length) * 100 
    : 0;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
            <SelectTrigger className="h-8 w-32 border-0 bg-muted/50">
              <div className="flex items-center gap-2">
                <PresetIcon className={cn('h-4 w-4', PRESET_CONFIG[preset].color)} />
                <span className="text-sm">{PRESET_CONFIG[preset].label}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESET_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* System prompt indicator */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className={cn(
              'h-8 px-2',
              currentWorkspace?.systemPrompt && 'text-primary'
            )}
          >
            <Settings2 className="h-4 w-4" />
            <ChevronDown className={cn('h-3 w-3 ml-1 transition-transform', showSystemPrompt && 'rotate-180')} />
          </Button>

          {/* Context packs */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContextPacks(!showContextPacks)}
            className={cn('h-8 px-2', attachedContextPacks.length > 0 && 'text-primary')}
          >
            <Paperclip className="h-4 w-4" />
            {attachedContextPacks.length > 0 && (
              <span className="ml-1 text-xs">{attachedContextPacks.length}</span>
            )}
          </Button>

          {/* Demo mode indicator */}
          {isDemoMode && (
            <Badge variant="outline" className="text-warning border-warning/50 gap-1">
              <Beaker className="h-3 w-3" />
              Demo Mode
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Start */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickStart}
            className="h-8 gap-1"
          >
            <Zap className="h-3 w-3" />
            Quick Demo
          </Button>

          {/* Token budget */}
          {prompt.length > 0 && (
            <div className="text-xs text-muted-foreground px-2">
              ~{tokenEstimate.total.toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>

      {/* System Prompt (collapsible) */}
      <Collapsible open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
        <CollapsibleContent>
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-1">System Prompt</div>
            <Textarea
              value={currentWorkspace?.systemPrompt || ''}
              readOnly
              className="min-h-[60px] text-xs font-mono resize-none bg-transparent border-dashed"
              placeholder="No system prompt set"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Context Packs (collapsible) */}
      <Collapsible open={showContextPacks} onOpenChange={setShowContextPacks}>
        <CollapsibleContent>
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-2">Attach Context</div>
            {contextPacks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No context packs yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {contextPacks.map(pack => (
                  <Badge
                    key={pack.id}
                    variant={attachedContextPacks.includes(pack.id) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleContextPackAttachment(pack.id)}
                  >
                    {pack.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Message History */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'p-3 rounded-lg',
                msg.role === 'user'
                  ? 'bg-primary/10 ml-8'
                  : 'bg-muted mr-8'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {msg.role}
                </span>
                {msg.provider && (
                  <Badge variant="outline" className={cn(
                    'text-[10px] px-1.5 py-0',
                    msg.provider === 'openai' && 'provider-openai',
                    msg.provider === 'anthropic' && 'provider-anthropic',
                    msg.provider === 'gemini' && 'provider-gemini',
                  )}>
                    {msg.model?.split('-')[0] || msg.provider}
                  </Badge>
                )}
                {msg.tokenUsage && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {msg.tokenUsage.total} tokens
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {messages.length === 0 && currentThread && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Start a conversation</p>
              <p className="text-xs mt-1">Type a prompt or click "Quick Demo" to begin</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Running Status */}
      {statuses.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {statuses.map(status => (
              <ModelStatusIndicator 
                key={status.modelId} 
                status={status}
                onRetry={status.canRetry ? () => handleRetry(status.modelId) : undefined}
                onCancel={status.status === 'running' ? () => cancel(status.modelId) : undefined}
              />
            ))}
            {isRunning && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive h-7"
                onClick={() => cancel()}
              >
                <StopCircle className="h-3 w-3 mr-1" />
                Cancel All
              </Button>
            )}
          </div>
          {isRunning && <Progress value={progressPercent} className="h-1" />}
        </div>
      )}

      {/* Model Selection */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_MODELS.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const hasKey = isDemoMode || apiKeys[model.provider as keyof typeof apiKeys];
            return (
              <Badge
                key={model.id}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all text-xs',
                  !hasKey && 'opacity-50 cursor-not-allowed',
                  isSelected && model.provider === 'openai' && 'provider-openai',
                  isSelected && model.provider === 'anthropic' && 'provider-anthropic',
                  isSelected && model.provider === 'gemini' && 'provider-gemini'
                )}
                onClick={() => hasKey && toggleModel(model.id)}
              >
                {model.short}
              </Badge>
            );
          })}
        </div>

        {!canRun && (
          <div className="flex items-center gap-2 text-xs text-warning mt-2">
            <AlertCircle className="h-3 w-3" />
            <span>Unlock API keys or enable Demo Mode in Settings</span>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt... (⌘+Enter to run)"
            className="min-h-[80px] pr-20 resize-none text-sm"
            disabled={!currentThread}
          />
          <Button
            size="sm"
            className="absolute right-2 bottom-2"
            onClick={handleRun}
            disabled={!prompt.trim() || isRunning || selectedModels.length === 0 || !canRun}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
