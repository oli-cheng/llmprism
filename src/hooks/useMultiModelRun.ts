import { useState, useCallback, useRef } from 'react';
import { getAdapter, parseModelId, ModelResponse } from '@/lib/model-adapters';

export interface ModelRunStatus {
  modelId: string;
  provider: string;
  model: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  response?: ModelResponse;
  error?: string;
}

interface UseMultiModelRunOptions {
  apiKeys: Record<string, string | undefined>;
  systemPrompt?: string;
  onResponse?: (response: ModelResponse) => void;
}

export function useMultiModelRun({ apiKeys, systemPrompt, onResponse }: UseMultiModelRunOptions) {
  const [statuses, setStatuses] = useState<ModelRunStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

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

    const responses: ModelResponse[] = [];
    abortControllersRef.current.clear();

    await Promise.all(
      selectedModels.map(async modelId => {
        const { provider, model } = parseModelId(modelId);
        const adapter = getAdapter(provider);
        const apiKey = apiKeys[provider];

        // Create abort controller for this request
        const abortController = new AbortController();
        abortControllersRef.current.set(modelId, abortController);

        // Update status to running
        setStatuses(prev => prev.map(s => 
          s.modelId === modelId ? { ...s, status: 'running' } : s
        ));

        if (!adapter || !apiKey) {
          setStatuses(prev => prev.map(s => 
            s.modelId === modelId 
              ? { ...s, status: 'error', error: 'No API key configured' } 
              : s
          ));
          return;
        }

        try {
          // Check if cancelled before starting
          if (abortController.signal.aborted) {
            setStatuses(prev => prev.map(s => 
              s.modelId === modelId ? { ...s, status: 'cancelled' } : s
            ));
            return;
          }

          const response = await adapter.send(
            model,
            [{ role: 'user', content: prompt }],
            { systemPrompt },
            apiKey
          );

          // Check if cancelled after response
          if (abortController.signal.aborted) {
            setStatuses(prev => prev.map(s => 
              s.modelId === modelId ? { ...s, status: 'cancelled' } : s
            ));
            return;
          }

          responses.push(response);
          onResponse?.(response);

          setStatuses(prev => prev.map(s => 
            s.modelId === modelId 
              ? { ...s, status: 'success', response } 
              : s
          ));
        } catch (err) {
          if (abortController.signal.aborted) {
            setStatuses(prev => prev.map(s => 
              s.modelId === modelId ? { ...s, status: 'cancelled' } : s
            ));
          } else {
            setStatuses(prev => prev.map(s => 
              s.modelId === modelId 
                ? { ...s, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' } 
                : s
            ));
          }
        }
      })
    );

    setIsRunning(false);
    abortControllersRef.current.clear();
    return responses;
  }, [apiKeys, systemPrompt, onResponse]);

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
  };
}
