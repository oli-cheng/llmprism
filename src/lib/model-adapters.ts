// Normalized model adapter interface for all providers

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ModelResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
  // Demo mode metadata
  isMock?: boolean;
  latencyMs?: number;
  estimatedCost?: number;
}

export interface ModelAdapter {
  provider: string;
  send(
    model: string,
    messages: ModelMessage[],
    options: ModelOptions,
    apiKey: string
  ): Promise<ModelResponse>;
  testConnection(apiKey: string): Promise<boolean>;
  getModels(): { id: string; name: string }[];
}

// OpenAI Adapter
const openaiAdapter: ModelAdapter = {
  provider: 'openai',
  
  async send(model, messages, options, apiKey) {
    const systemMessage = options.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }]
      : [];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [...systemMessage, ...messages],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      provider: 'openai',
      model,
    };
  },

  async testConnection(apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  getModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1-preview', name: 'o1 Preview' },
      { id: 'o1-mini', name: 'o1 Mini' },
    ];
  },
};

// Anthropic Adapter
const anthropicAdapter: ModelAdapter = {
  provider: 'anthropic',

  async send(model, messages, options, apiKey) {
    const systemPrompt = options.systemPrompt || undefined;
    
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      provider: 'anthropic',
      model,
    };
  },

  async testConnection(apiKey) {
    try {
      // Just validate key format - Anthropic doesn't have a lightweight endpoint
      return apiKey.startsWith('sk-ant-');
    } catch {
      return false;
    }
  },

  getModels() {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ];
  },
};

// Google Gemini Adapter
const geminiAdapter: ModelAdapter = {
  provider: 'gemini',

  async send(model, messages, options, apiKey) {
    const systemInstruction = options.systemPrompt
      ? { parts: [{ text: options.systemPrompt }] }
      : undefined;

    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    
    return {
      content: candidate?.content?.parts?.[0]?.text || '',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      provider: 'gemini',
      model,
    };
  },

  async testConnection(apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getModels() {
    return [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
    ];
  },
};

// Adapter registry
export const modelAdapters: Record<string, ModelAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(provider: string): ModelAdapter | undefined {
  return modelAdapters[provider];
}

export function getAllProviders(): string[] {
  return Object.keys(modelAdapters);
}

export function getProviderModels(provider: string): { id: string; name: string }[] {
  return modelAdapters[provider]?.getModels() || [];
}

export function parseModelId(fullModelId: string): { provider: string; model: string } {
  const [provider, ...modelParts] = fullModelId.split(':');
  return { provider, model: modelParts.join(':') || provider };
}

export function formatModelId(provider: string, model: string): string {
  return `${provider}:${model}`;
}
