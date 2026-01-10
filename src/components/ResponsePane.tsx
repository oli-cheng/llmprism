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
    if (!selectedText || !finalTextareaRef.current) return;

    const textarea = finalTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = finalContent.slice(0, start);
    const after = finalContent.slice(end);
    
    const newContent = before + selectedText.text + after;
    setFinalContent(newContent);
    
    // Move cursor to end of inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + selectedText.text.length;
      textarea.setSelectionRange(newPosition, newPosition);
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
    const blob = new Blob([finalContent], {
      type: format === 'md' ? 'text/markdown' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${format}`;
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
      <div className="flex flex-col h-full bg-card items-center justify-center text-muted-foreground">
        <Sparkles className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-sm">Run a prompt to see responses</p>
        <p className="text-xs mt-1">Compare outputs from multiple models side by side</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Selection Action Bar */}
      {selectedText && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border-b border-primary/20 animate-fade-in">
          <MousePointer2 className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground truncate flex-1">
            "{selectedText.text.slice(0, 50)}{selectedText.text.length > 50 ? '...' : ''}"
          </span>
          <Button size="sm" variant="default" onClick={handleInsertAtCursor}>
            <Plus className="h-3 w-3 mr-1" />
            Insert at Cursor
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedText(null)}>
            Cancel
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Tab Headers */}
        <div className="border-b border-border">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-auto p-0">
            {responses.map((response, index) => (
              <TabsTrigger
                key={`${response.provider}-${response.model}`}
                value={response.model}
                className={cn(
                  'rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
                  'data-[state=active]:bg-transparent px-4 py-3'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <Badge variant="outline" className={cn('text-[10px]', getProviderColor(response.provider))}>
                    {response.provider}
                  </Badge>
                </div>
              </TabsTrigger>
            ))}
            <TabsTrigger
              value="final"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
                'data-[state=active]:bg-transparent px-4 py-3 ml-auto'
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Final
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
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Badge className={getProviderColor(response.provider)}>
                  {response.model}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {response.usage.totalTokens.toLocaleString()} tokens
                  <span className="mx-2">•</span>
                  {response.usage.promptTokens} prompt / {response.usage.completionTokens} completion
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(response.content, response.model)}
                >
                  {copiedTab === response.model ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAppendToFinal(response.content)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Append
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
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
              💡 Select text and click "Insert at Cursor" to add to final draft
            </div>
          </TabsContent>
        ))}

        {/* Final Editor */}
        <TabsContent value="final" className="flex-1 m-0 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Final Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(finalContent, 'final')}
                disabled={!finalContent}
              >
                {copiedTab === 'final' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport('md')}
                disabled={!finalContent}
              >
                <Download className="h-4 w-4 mr-1" />
                .md
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport('txt')}
                disabled={!finalContent}
              >
                <Download className="h-4 w-4 mr-1" />
                .txt
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4">
            <Textarea
              ref={finalTextareaRef}
              value={finalContent}
              onChange={e => setFinalContent(e.target.value)}
              placeholder="Select text from responses and click 'Insert at Cursor' to build your final draft..."
              className="h-full resize-none font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
