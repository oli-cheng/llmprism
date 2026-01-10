import React, { useState, useMemo } from 'react';
import { useApp, Preset } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Play,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoutingRule, generateId } from '@/lib/storage';

const AVAILABLE_MODELS = [
  'openai:gpt-4o',
  'openai:gpt-4o-mini',
  'anthropic:claude-3-5-sonnet-20241022',
  'anthropic:claude-3-5-haiku-20241022',
  'gemini:gemini-1.5-pro',
  'gemini:gemini-1.5-flash',
];

interface RoutingRulesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// JSON Schema for routing rules
const ROUTING_RULE_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'condition', 'preferredModels', 'enabled'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    condition: {
      type: 'object',
      properties: {
        preset: { type: 'string', enum: ['research', 'code', 'operator'] },
        contentLength: { type: 'string', enum: ['short', 'medium', 'long'] },
        hasCode: { type: 'boolean' },
      },
    },
    preferredModels: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    enabled: { type: 'boolean' },
  },
};

function validateRule(rule: RoutingRule): string[] {
  const errors: string[] = [];
  
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!rule.preferredModels || rule.preferredModels.length === 0) {
    errors.push('At least one model must be selected');
  }
  
  const invalidModels = rule.preferredModels.filter(m => !AVAILABLE_MODELS.includes(m));
  if (invalidModels.length > 0) {
    errors.push(`Invalid models: ${invalidModels.join(', ')}`);
  }
  
  if (rule.condition.preset && !['research', 'code', 'operator'].includes(rule.condition.preset)) {
    errors.push('Invalid preset value');
  }
  
  if (rule.condition.contentLength && !['short', 'medium', 'long'].includes(rule.condition.contentLength)) {
    errors.push('Invalid content length value');
  }
  
  return errors;
}

function simulateRouting(
  rules: RoutingRule[],
  preset: Preset,
  promptLength: number
): { matchedRule: RoutingRule | null; selectedModels: string[] } {
  const contentLength = promptLength < 500 ? 'short' : promptLength < 2000 ? 'medium' : 'long';
  const hasCode = false; // Would need content analysis
  
  for (const rule of rules.filter(r => r.enabled)) {
    let matches = true;
    
    if (rule.condition.preset && rule.condition.preset !== preset) {
      matches = false;
    }
    if (rule.condition.contentLength && rule.condition.contentLength !== contentLength) {
      matches = false;
    }
    if (rule.condition.hasCode !== undefined && rule.condition.hasCode !== hasCode) {
      matches = false;
    }
    
    if (matches) {
      return { matchedRule: rule, selectedModels: rule.preferredModels };
    }
  }
  
  return { matchedRule: null, selectedModels: [] };
}

export function RoutingRulesEditor({ open, onOpenChange }: RoutingRulesEditorProps) {
  const { routingRules, updateRoutingRules, preset } = useApp();
  const [localRules, setLocalRules] = useState<RoutingRule[]>(routingRules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [simulatePromptLength, setSimulatePromptLength] = useState(1000);
  const [jsonView, setJsonView] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Validation errors for each rule
  const ruleErrors = useMemo(() => {
    const errors: Record<string, string[]> = {};
    localRules.forEach(rule => {
      errors[rule.id] = validateRule(rule);
    });
    return errors;
  }, [localRules]);

  // Simulation result
  const simulationResult = useMemo(() => {
    return simulateRouting(localRules, preset, simulatePromptLength);
  }, [localRules, preset, simulatePromptLength]);

  const handleSave = () => {
    const hasErrors = Object.values(ruleErrors).some(e => e.length > 0);
    if (hasErrors) return;
    
    updateRoutingRules(localRules);
    onOpenChange(false);
  };

  const handleAddRule = () => {
    const newRule: RoutingRule = {
      id: generateId(),
      name: 'New Rule',
      condition: {},
      preferredModels: [AVAILABLE_MODELS[0]],
      enabled: true,
    };
    setLocalRules(prev => [...prev, newRule]);
    setEditingId(newRule.id);
  };

  const handleDeleteRule = (id: string) => {
    setLocalRules(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<RoutingRule>) => {
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleJsonChange = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        setJsonError('Must be an array of rules');
        return;
      }
      setLocalRules(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Routing Rules</DialogTitle>
          <DialogDescription>
            Configure which models are preferred based on preset and content
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={jsonView ? 'outline' : 'default'}
            size="sm"
            onClick={() => setJsonView(false)}
          >
            Visual Editor
          </Button>
          <Button
            variant={jsonView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setJsonView(true)}
          >
            JSON
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {jsonView ? (
            <div className="space-y-2">
              <Textarea
                value={JSON.stringify(localRules, null, 2)}
                onChange={e => handleJsonChange(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
              />
              {jsonError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {jsonError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {localRules.map((rule, index) => {
                const errors = ruleErrors[rule.id] || [];
                const isEditing = editingId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      errors.length > 0 ? 'border-destructive' : 'border-border',
                      isEditing && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={checked => handleUpdateRule(rule.id, { enabled: checked })}
                      />
                      <Input
                        value={rule.name}
                        onChange={e => handleUpdateRule(rule.id, { name: e.target.value })}
                        className="flex-1 h-8"
                        placeholder="Rule name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <Label className="text-xs">Preset</Label>
                        <Select
                          value={rule.condition.preset || 'any'}
                          onValueChange={v => handleUpdateRule(rule.id, {
                            condition: { ...rule.condition, preset: v === 'any' ? undefined : v }
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="code">Code</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Content Length</Label>
                        <Select
                          value={rule.condition.contentLength || 'any'}
                          onValueChange={v => handleUpdateRule(rule.id, {
                            condition: { ...rule.condition, contentLength: v === 'any' ? undefined : v as 'short' | 'medium' | 'long' }
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="short">Short (&lt;500 chars)</SelectItem>
                            <SelectItem value="medium">Medium (500-2000)</SelectItem>
                            <SelectItem value="long">Long (&gt;2000)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Has Code</Label>
                        <Select
                          value={rule.condition.hasCode === undefined ? 'any' : rule.condition.hasCode ? 'yes' : 'no'}
                          onValueChange={v => handleUpdateRule(rule.id, {
                            condition: { ...rule.condition, hasCode: v === 'any' ? undefined : v === 'yes' }
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Preferred Models (in order)</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {AVAILABLE_MODELS.map(model => {
                          const isSelected = rule.preferredModels.includes(model);
                          const order = rule.preferredModels.indexOf(model);
                          return (
                            <Badge
                              key={model}
                              variant={isSelected ? 'default' : 'outline'}
                              className={cn('cursor-pointer', isSelected && 'pl-1')}
                              onClick={() => {
                                const newModels = isSelected
                                  ? rule.preferredModels.filter(m => m !== model)
                                  : [...rule.preferredModels, model];
                                handleUpdateRule(rule.id, { preferredModels: newModels });
                              }}
                            >
                              {isSelected && (
                                <span className="mr-1 text-[10px] bg-background/20 rounded-full px-1.5">
                                  {order + 1}
                                </span>
                              )}
                              {model.split(':')[1]}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {errors.map((error, i) => (
                          <div key={i} className="flex items-center gap-2 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button variant="outline" onClick={handleAddRule} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Simulation */}
        <div className="pt-4 border-t border-border mt-4">
          <div className="flex items-center gap-4 mb-2">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Simulate Routing</span>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs">Prompt length:</Label>
              <Input
                type="number"
                value={simulatePromptLength}
                onChange={e => setSimulatePromptLength(Number(e.target.value))}
                className="w-24 h-8"
              />
              <Badge variant="outline">{preset}</Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-sm">
            {simulationResult.matchedRule ? (
              <div>
                <span className="text-muted-foreground">Matched: </span>
                <span className="font-medium">{simulationResult.matchedRule.name}</span>
                <div className="flex gap-2 mt-2">
                  {simulationResult.selectedModels.map((m, i) => (
                    <Badge key={m} variant={i === 0 ? 'default' : 'outline'}>
                      {i + 1}. {m.split(':')[1]}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">No matching rule. Default models will be used.</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={Object.values(ruleErrors).some(e => e.length > 0)}>
            Save Rules
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
