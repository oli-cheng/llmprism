import React, { useState, useCallback } from 'react';
import { useApp, Preset } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Play,
  ChevronDown,
  Settings2,
  Sparkles,
  Code2,
  Briefcase,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAdapter, parseModelId, ModelResponse } from '@/lib/model-adapters';

const PRESET_CONFIG: Record<Preset, { icon: React.ElementType; label: string; color: string }> = {
  research: { icon: Sparkles, label: 'Research Desk', color: 'text-blue-400' },
  code: { icon: Code2, label: 'Code Bench', color: 'text-green-400' },
  operator: { icon: Briefcase, label: 'Operator Inbox', color: 'text-orange-400' },
};

interface PromptEditorProps {
  onResponses: (responses: ModelResponse[]) => void;
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
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(
    currentWorkspace?.defaultModels.slice(0, 2) || []
  );
  const [isRunning, setIsRunning] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = [
    { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai' },
    { id: 'openai:gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
    { id: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'anthropic:claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
    { id: 'gemini:gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
    { id: 'gemini:gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
  ];

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

    setIsRunning(true);
    setError(null);

    // Add user message
    addMessage({
      threadId: currentThread.id,
      role: 'user',
      content: prompt.trim(),
    });

    const responses: ModelResponse[] = [];
    const errors: string[] = [];

    // Run all selected models in parallel
    await Promise.all(
      selectedModels.map(async modelId => {
        const { provider, model } = parseModelId(modelId);
        const adapter = getAdapter(provider);
        const apiKey = apiKeys[provider as keyof typeof apiKeys];

        if (!adapter || !apiKey) {
          errors.push(`${provider}: No API key configured`);
          return;
        }

        try {
          const response = await adapter.send(
            model,
            [{ role: 'user', content: prompt.trim() }],
            { systemPrompt: currentWorkspace?.systemPrompt },
            apiKey
          );
          responses.push(response);

          // Add assistant message for this response
          addMessage({
            threadId: currentThread.id,
            role: 'assistant',
            provider,
            model,
            content: response.content,
            tokenUsage: {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens,
            },
          });
        } catch (err) {
          errors.push(`${provider}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      })
    );

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    onResponses(responses);
    setPrompt('');
    setIsRunning(false);
  }, [prompt, currentThread, selectedModels, apiKeys, currentWorkspace, addMessage, onResponses]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const PresetIcon = PRESET_CONFIG[preset].icon;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <PresetIcon className={cn('h-5 w-5', PRESET_CONFIG[preset].color)} />
            <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
              <SelectTrigger className="h-8 w-40 border-0 bg-transparent">
                <SelectValue />
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
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          System Prompt
          <ChevronDown
            className={cn('h-4 w-4 ml-1 transition-transform', showSystemPrompt && 'rotate-180')}
          />
        </Button>
      </div>

      {/* System Prompt (collapsible) */}
      <Collapsible open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
        <CollapsibleContent>
          <div className="p-4 border-b border-border bg-muted/30">
            <Textarea
              value={currentWorkspace?.systemPrompt || ''}
              readOnly
              className="min-h-[80px] text-sm font-mono resize-none bg-transparent border-dashed"
              placeholder="No system prompt set"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Message History */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {msg.provider}:{msg.model}
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
              <p className="text-xs mt-1">Enter a prompt below and run it across multiple models</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Model Selection */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex flex-wrap gap-2">
          {availableModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const hasKey = apiKeys[model.provider as keyof typeof apiKeys];
            return (
              <Badge
                key={model.id}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all',
                  !hasKey && 'opacity-50 cursor-not-allowed',
                  isSelected && model.provider === 'openai' && 'provider-openai',
                  isSelected && model.provider === 'anthropic' && 'provider-anthropic',
                  isSelected && model.provider === 'gemini' && 'provider-gemini'
                )}
                onClick={() => hasKey && toggleModel(model.id)}
              >
                {model.label}
              </Badge>
            );
          })}
        </div>

        {!isUnlocked && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertCircle className="h-4 w-4" />
            <span>Unlock your API keys to run prompts</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
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
            className="min-h-[100px] pr-20 resize-none"
            disabled={!currentThread || !isUnlocked}
          />
          <Button
            size="sm"
            className="absolute right-2 bottom-2"
            onClick={handleRun}
            disabled={!prompt.trim() || isRunning || selectedModels.length === 0 || !isUnlocked}
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
