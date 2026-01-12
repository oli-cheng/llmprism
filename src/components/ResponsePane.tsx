import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy,
  Download,
  FileText,
  Check,
  Sparkles,
  Plus,
  MousePointer2,
  Clock,
  DollarSign,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelResponse } from '@/lib/model-adapters';
import { toast } from 'sonner';

interface ResponsePaneProps {
  responses: ModelResponse[];
}

export function ResponsePane({ responses }: ResponsePaneProps) {
  const [finalContent, setFinalContent] = useState('');
  const [activeTab, setActiveTab] = useState<string>(responses[0]?.model || 'final');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<{ text: string; responseIndex: number } | null>(null);
  const finalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  // Track cursor position when textarea is focused
  const handleFinalSelect = useCallback(() => {
    if (finalTextareaRef.current) {
      cursorPositionRef.current = finalTextareaRef.current.selectionStart;
    }
  }, []);

  // Update active tab when new responses come in
  React.useEffect(() => {
    if (responses.length > 0 && activeTab !== 'final') {
      setActiveTab(responses[0].model);
    }
  }, [responses.length]);

  const handleCopy = async (content: string, tab: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleTextSelection = useCallback((responseIndex: number) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      setSelectedText({ text, responseIndex });
    }
  }, []);

  const handleInsertAtCursor = useCallback(() => {
    if (!selectedText) return;

    const textarea = finalTextareaRef.current;
    let insertPosition = cursorPositionRef.current;
    
    // If no valid cursor position, insert at end
    if (!textarea || insertPosition === undefined || insertPosition < 0) {
      insertPosition = finalContent.length;
      toast.info('Inserted at end (no cursor position set)');
    }

    const before = finalContent.slice(0, insertPosition);
    const after = finalContent.slice(insertPosition);
    
    const newContent = before + selectedText.text + after;
    setFinalContent(newContent);
    
    // Update cursor position ref
    cursorPositionRef.current = insertPosition + selectedText.text.length;

    // Focus and set cursor after state update
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPosition = insertPosition + selectedText.text.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);

    setSelectedText(null);
    toast.success('Inserted into final draft');
  }, [selectedText, finalContent]);

  const handleAppendToFinal = useCallback((content: string) => {
    setFinalContent(prev => {
      if (prev) {
        return prev + '\n\n---\n\n' + content;
      }
      return content;
    });
    setActiveTab('final');
    toast.success('Appended to final draft');
  }, []);

  const handleExport = (format: 'md' | 'txt') => {
    if (!finalContent) {
      toast.error('No content to export');
      return;
    }
    const blob = new Blob([finalContent], {
      type: format === 'md' ? 'text/markdown' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llmprism-export-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported as .${format}`);
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'provider-openai';
      case 'anthropic':
        return 'provider-anthropic';
      case 'gemini':
        return 'provider-gemini';
      default:
        return '';
    }
  };

  if (responses.length === 0) {
    return (
      <div className="flex flex-col h-full bg-card items-center justify-center text-muted-foreground p-6">
        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">Run a prompt to compare</p>
        <p className="text-xs mt-1 text-center max-w-[200px]">
          Select 2-3 models and click Run to see responses side by side
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Selection Action Bar */}
      {selectedText && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border-b border-primary/20 animate-fade-in">
          <MousePointer2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">
            "{selectedText.text.slice(0, 40)}{selectedText.text.length > 40 ? '...' : ''}"
          </span>
          <Button size="sm" variant="default" onClick={handleInsertAtCursor} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Insert at Cursor
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedText(null)} className="h-7 text-xs">
            Cancel
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Tab Headers */}
        <div className="border-b border-border overflow-x-auto">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-auto p-0 min-w-max">
            {responses.map((response, index) => (
              <TabsTrigger
                key={`${response.provider}-${response.model}`}
                value={response.model}
                className={cn(
                  'rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
                  'data-[state=active]:bg-transparent px-3 py-2.5 min-w-[80px]'
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5', getProviderColor(response.provider))}>
                      {response.provider}
                    </Badge>
                  </div>
                  {response.isMock && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 text-warning border-warning/50">
                      <Beaker className="h-2 w-2 mr-0.5" />
                      MOCK
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
            <TabsTrigger
              value="final"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
                'data-[state=active]:bg-transparent px-3 py-2.5 ml-auto'
              )}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs">Final</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Response Contents */}
        {responses.map((response, index) => (
          <TabsContent
            key={`${response.provider}-${response.model}`}
            value={response.model}
            className="flex-1 m-0 flex flex-col"
          >
            {/* Response Header */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Badge className={cn('text-xs', getProviderColor(response.provider))}>
                  {response.model.split('-').slice(0, 2).join('-')}
                </Badge>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{response.usage.totalTokens.toLocaleString()} tok</span>
                  {response.latencyMs && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {(response.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {response.estimatedCost !== undefined && (
                    <span className="flex items-center gap-0.5">
                      <DollarSign className="h-2.5 w-2.5" />
                      ${response.estimatedCost.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleCopy(response.content, response.model)}
                >
                  {copiedTab === response.model ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleAppendToFinal(response.content)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Response Content - Selectable */}
            <ScrollArea className="flex-1">
              <div 
                className="p-4"
                onMouseUp={() => handleTextSelection(index)}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed select-text cursor-text">
                    {response.content}
                  </pre>
                </div>
              </div>
            </ScrollArea>
            
            {/* Selection hint */}
            <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
              💡 Select text → "Insert at Cursor" to add to final draft
            </div>
          </TabsContent>
        ))}

        {/* Final Editor */}
        <TabsContent value="final" className="flex-1 m-0 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Final Draft</span>
              {finalContent && (
                <span className="text-xs text-muted-foreground">
                  {finalContent.length} chars
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleCopy(finalContent, 'final')}
                disabled={!finalContent}
              >
                {copiedTab === 'final' ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => handleExport('md')}
                disabled={!finalContent}
              >
                <Download className="h-3 w-3" />
                <span className="text-xs">.md</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 p-3">
            <Textarea
              ref={finalTextareaRef}
              value={finalContent}
              onChange={e => setFinalContent(e.target.value)}
              onSelect={handleFinalSelect}
              onClick={handleFinalSelect}
              onKeyUp={handleFinalSelect}
              placeholder="Select text from responses and click 'Insert at Cursor' to build your final draft..."
              className="h-full resize-none font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
