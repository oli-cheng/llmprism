// Local storage utilities with type safety

const STORAGE_KEYS = {
  WORKSPACES: 'prism_workspaces',
  THREADS: 'prism_threads',
  MESSAGES: 'prism_messages',
  API_KEYS: 'prism_api_keys',
  SETTINGS: 'prism_settings',
  SNIPPETS: 'prism_snippets',
  ROUTING_RULES: 'prism_routing_rules',
} as const;

export interface Workspace {
  id: string;
  name: string;
  systemPrompt: string;
  defaultModels: string[];
  templateVars: Record<string, string>;
  preset: 'research' | 'code' | 'operator';
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: string;
  workspaceId: string;
  title: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  provider?: string;
  model?: string;
  content: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  createdAt: string;
}

export interface Snippet {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  fontSize: number;
  editorWidth: 'narrow' | 'medium' | 'wide';
  showLeftPane: boolean;
  showRightPane: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: {
    preset?: string;
    contentLength?: 'short' | 'medium' | 'long';
    hasCode?: boolean;
  };
  preferredModels: string[];
  enabled: boolean;
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Workspaces
export function getWorkspaces(): Workspace[] {
  return getStorage<Workspace[]>(STORAGE_KEYS.WORKSPACES, []);
}

export function saveWorkspace(workspace: Workspace): void {
  const workspaces = getWorkspaces();
  const index = workspaces.findIndex(w => w.id === workspace.id);
  if (index >= 0) {
    workspaces[index] = { ...workspace, updatedAt: new Date().toISOString() };
  } else {
    workspaces.push(workspace);
  }
  setStorage(STORAGE_KEYS.WORKSPACES, workspaces);
}

export function deleteWorkspace(id: string): void {
  const workspaces = getWorkspaces().filter(w => w.id !== id);
  setStorage(STORAGE_KEYS.WORKSPACES, workspaces);
  // Also delete related threads and messages
  const threads = getThreads().filter(t => t.workspaceId !== id);
  setStorage(STORAGE_KEYS.THREADS, threads);
}

// Threads
export function getThreads(): Thread[] {
  return getStorage<Thread[]>(STORAGE_KEYS.THREADS, []);
}

export function getThreadsByWorkspace(workspaceId: string): Thread[] {
  return getThreads()
    .filter(t => t.workspaceId === workspaceId)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function saveThread(thread: Thread): void {
  const threads = getThreads();
  const index = threads.findIndex(t => t.id === thread.id);
  if (index >= 0) {
    threads[index] = { ...thread, updatedAt: new Date().toISOString() };
  } else {
    threads.push(thread);
  }
  setStorage(STORAGE_KEYS.THREADS, threads);
}

export function deleteThread(id: string): void {
  const threads = getThreads().filter(t => t.id !== id);
  setStorage(STORAGE_KEYS.THREADS, threads);
  // Also delete messages
  const messages = getMessages().filter(m => m.threadId !== id);
  setStorage(STORAGE_KEYS.MESSAGES, messages);
}

// Messages
export function getMessages(): Message[] {
  return getStorage<Message[]>(STORAGE_KEYS.MESSAGES, []);
}

export function getMessagesByThread(threadId: string): Message[] {
  return getMessages()
    .filter(m => m.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function saveMessage(message: Message): void {
  const messages = getMessages();
  messages.push(message);
  setStorage(STORAGE_KEYS.MESSAGES, messages);
}

// API Keys (encrypted)
export function getEncryptedApiKeys(): string | null {
  return localStorage.getItem(STORAGE_KEYS.API_KEYS);
}

export function setEncryptedApiKeys(encrypted: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEYS, encrypted);
}

export function hasApiKeysStored(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.API_KEYS);
}

// Settings
export function getSettings(): Settings {
  return getStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    theme: 'dark',
    fontSize: 14,
    editorWidth: 'medium',
    showLeftPane: true,
    showRightPane: true,
  });
}

export function saveSettings(settings: Settings): void {
  setStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Snippets
export function getSnippets(): Snippet[] {
  return getStorage<Snippet[]>(STORAGE_KEYS.SNIPPETS, []);
}

export function saveSnippet(snippet: Snippet): void {
  const snippets = getSnippets();
  const index = snippets.findIndex(s => s.id === snippet.id);
  if (index >= 0) {
    snippets[index] = snippet;
  } else {
    snippets.push(snippet);
  }
  setStorage(STORAGE_KEYS.SNIPPETS, snippets);
}

export function deleteSnippet(id: string): void {
  const snippets = getSnippets().filter(s => s.id !== id);
  setStorage(STORAGE_KEYS.SNIPPETS, snippets);
}

// Routing Rules
export function getRoutingRules(): RoutingRule[] {
  return getStorage<RoutingRule[]>(STORAGE_KEYS.ROUTING_RULES, [
    {
      id: 'default-code',
      name: 'Code Bench - Claude for long code',
      condition: { preset: 'code', contentLength: 'long' },
      preferredModels: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
      enabled: true,
    },
    {
      id: 'default-research',
      name: 'Research - GPT-4 primary',
      condition: { preset: 'research' },
      preferredModels: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
      enabled: true,
    },
  ]);
}

export function saveRoutingRules(rules: RoutingRule[]): void {
  setStorage(STORAGE_KEYS.ROUTING_RULES, rules);
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  sessionStorage.clear();
}

// Generate IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
