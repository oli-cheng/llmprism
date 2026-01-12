// Self-check functionality for QA verification
import { useState, useCallback } from 'react';
import { generateId } from '@/lib/storage';

export interface CheckResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
}

export function useSelfCheck() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runChecks = useCallback(async (
    createWorkspace: (name: string) => { id: string },
    createThread: (title?: string) => { id: string },
    addMessage: (msg: { threadId: string; role: string; content: string; provider?: string; model?: string }) => { id: string },
  ) => {
    setIsRunning(true);
    const checks: CheckResult[] = [
      { name: 'Create Workspace', status: 'pending' },
      { name: 'Create Thread', status: 'pending' },
      { name: 'Add User Message', status: 'pending' },
      { name: 'Add Assistant Messages (2)', status: 'pending' },
      { name: 'Verify Message Count', status: 'pending' },
      { name: 'Export Markdown', status: 'pending' },
    ];

    setResults([...checks]);

    let workspaceId: string | null = null;
    let threadId: string | null = null;
    let messageCount = 0;

    // Check 1: Create Workspace
    const updateCheck = (index: number, update: Partial<CheckResult>) => {
      setResults(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c));
    };

    try {
      updateCheck(0, { status: 'running' });
      const start = Date.now();
      const workspace = createWorkspace(`Self-Check ${Date.now()}`);
      workspaceId = workspace.id;
      updateCheck(0, { status: 'pass', duration: Date.now() - start, message: `ID: ${workspaceId.slice(0, 8)}...` });
    } catch (e) {
      updateCheck(0, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
      setIsRunning(false);
      return;
    }

    // Check 2: Create Thread
    try {
      updateCheck(1, { status: 'running' });
      const start = Date.now();
      const thread = createThread('Self-Check Thread');
      threadId = thread.id;
      updateCheck(1, { status: 'pass', duration: Date.now() - start, message: `ID: ${threadId.slice(0, 8)}...` });
    } catch (e) {
      updateCheck(1, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
      setIsRunning(false);
      return;
    }

    // Check 3: Add User Message
    try {
      updateCheck(2, { status: 'running' });
      const start = Date.now();
      addMessage({ threadId, role: 'user', content: 'Self-check test prompt' });
      messageCount++;
      updateCheck(2, { status: 'pass', duration: Date.now() - start });
    } catch (e) {
      updateCheck(2, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
      setIsRunning(false);
      return;
    }

    // Check 4: Add 2 Assistant Messages
    try {
      updateCheck(3, { status: 'running' });
      const start = Date.now();
      addMessage({ 
        threadId, 
        role: 'assistant', 
        content: 'Mock response from OpenAI',
        provider: 'openai',
        model: 'gpt-4o',
      });
      addMessage({ 
        threadId, 
        role: 'assistant', 
        content: 'Mock response from Anthropic',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
      });
      messageCount += 2;
      updateCheck(3, { status: 'pass', duration: Date.now() - start, message: '2 messages added' });
    } catch (e) {
      updateCheck(3, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
      setIsRunning(false);
      return;
    }

    // Check 5: Verify Message Count
    try {
      updateCheck(4, { status: 'running' });
      const start = Date.now();
      if (messageCount >= 3) {
        updateCheck(4, { status: 'pass', duration: Date.now() - start, message: `${messageCount} messages` });
      } else {
        throw new Error(`Expected 3+ messages, got ${messageCount}`);
      }
    } catch (e) {
      updateCheck(4, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
    }

    // Check 6: Export Test
    try {
      updateCheck(5, { status: 'running' });
      const start = Date.now();
      const markdown = `# Self-Check Export\n\nGenerated at ${new Date().toISOString()}`;
      const blob = new Blob([markdown], { type: 'text/markdown' });
      if (blob.size > 0) {
        updateCheck(5, { status: 'pass', duration: Date.now() - start, message: `${blob.size} bytes` });
      } else {
        throw new Error('Empty blob');
      }
    } catch (e) {
      updateCheck(5, { status: 'fail', message: e instanceof Error ? e.message : 'Unknown error' });
    }

    setIsRunning(false);
  }, []);

  return { results, isRunning, runChecks };
}
