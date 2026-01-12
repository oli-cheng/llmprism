import { useState, useCallback, useRef } from 'react';
import { getAdapter, parseModelId, ModelResponse } from '@/lib/model-adapters';
import { getDemoResponse } from '@/lib/demo-mode';
import { estimateTokens } from '@/lib/storage';

export interface ModelRunStatus {
  modelId: string;
  provider: string;
  model: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  response?: ModelResponse;
  error?: string;
  canRetry?: boolean;
}

interface UseMultiModelRunOptions {
  apiKeys: Record<string, string | undefined>;
  systemPrompt?: string;
  onResponse?: (response: ModelResponse) => void;
  demoMode?: boolean;
}

export function useMultiModelRun({ apiKeys, systemPrompt, onResponse, demoMode }: UseMultiModelRunOptions) {
  const [statuses, setStatuses] = useState<ModelRunStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const runSingleModel = useCallback(async (
    modelId: string,
    prompt: string,
  ): Promise<ModelResponse | null> => {
    const { provider, model } = parseModelId(modelId);
    const abortController = new AbortController();
    abortControllersRef.current.set(modelId, abortController);

    setStatuses(prev => prev.map(s => 
      s.modelId === modelId ? { ...s, status: 'running', error: undefined, canRetry: false } : s
    ));

    try {
      if (abortController.signal.aborted) {
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId ? { ...s, status: 'cancelled' } : s
        ));
        return null;
      }

      let response: ModelResponse;
      
      if (demoMode) {
        // Use mock responses in demo mode
        const promptTokens = estimateTokens(prompt);
        response = await getDemoResponse(provider, model, promptTokens);
      } else {
        const adapter = getAdapter(provider);
        const apiKey = apiKeys[provider];

        if (!adapter || !apiKey) {
          setStatuses(prev => prev.map(s => 
            s.modelId === modelId 
              ? { ...s, status: 'error', error: 'No API key configured', canRetry: true } 
              : s
          ));
          return null;
        }

        response = await adapter.send(
          model,
          [{ role: 'user', content: prompt }],
          { systemPrompt },
          apiKey
        );
      }

      if (abortController.signal.aborted) {
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId ? { ...s, status: 'cancelled' } : s
        ));
        return null;
      }

      onResponse?.(response);
      setStatuses(prev => prev.map(s => 
        s.modelId === modelId 
          ? { ...s, status: 'success', response } 
          : s
      ));
      return response;
    } catch (err) {
      if (abortController.signal.aborted) {
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId ? { ...s, status: 'cancelled' } : s
        ));
      } else {
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId 
            ? { ...s, status: 'error', error: err instanceof Error ? err.message : 'Unknown error', canRetry: true } 
            : s
        ));
      }
      return null;
    }
  }, [apiKeys, systemPrompt, onResponse, demoMode]);

  const run = useCallback(async (prompt: string, selectedModels: string[]) => {
    if (selectedModels.length === 0) return [];

    setIsRunning(true);
    
    // Initialize statuses
    const initialStatuses: ModelRunStatus[] = selectedModels.map(modelId => {
      const { provider, model } = parseModelId(modelId);
      return {
        modelId,
        provider,
        model,
        status: 'pending',
      };
    });
    setStatuses(initialStatuses);

    abortControllersRef.current.clear();

    const results = await Promise.all(
      selectedModels.map(modelId => runSingleModel(modelId, prompt))
    );

    setIsRunning(false);
    return results.filter((r): r is ModelResponse => r !== null);
  }, [runSingleModel]);

  const retry = useCallback(async (modelId: string, prompt: string) => {
    const response = await runSingleModel(modelId, prompt);
    if (response) {
      return response;
    }
    return null;
  }, [runSingleModel]);

  const cancel = useCallback((modelId?: string) => {
    if (modelId) {
      const controller = abortControllersRef.current.get(modelId);
      if (controller) {
        controller.abort();
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId ? { ...s, status: 'cancelled' } : s
        ));
      }
    } else {
      // Cancel all
      abortControllersRef.current.forEach((controller, id) => {
        controller.abort();
      });
      setStatuses(prev => prev.map(s => 
        s.status === 'running' || s.status === 'pending' 
          ? { ...s, status: 'cancelled' } 
          : s
      ));
    }
  }, []);

  const reset = useCallback(() => {
    setStatuses([]);
    setIsRunning(false);
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  return {
    statuses,
    isRunning,
    run,
    cancel,
    reset,
    retry,
  };
}
