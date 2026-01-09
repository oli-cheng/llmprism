import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy,
  Download,
  FileText,
  Merge,
  Check,
  Sparkles,
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

  const handleCopy = async (content: string, tab: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleMerge = (content: string) => {
    setFinalContent(prev => {
      if (prev) {
        return prev + '\n\n---\n\n' + content;
      }
      return content;
    });
    setActiveTab('final');
    toast.success('Merged into final draft');
  };

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
                  onClick={() => handleMerge(response.content)}
                >
                  <Merge className="h-4 w-4 mr-1" />
                  Merge
                </Button>
              </div>
            </div>

            {/* Response Content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {response.content}
                  </pre>
                </div>
              </div>
            </ScrollArea>
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
              value={finalContent}
              onChange={e => setFinalContent(e.target.value)}
              placeholder="Merge responses here to create your final draft..."
              className="h-full resize-none font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
