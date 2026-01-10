import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  Thread,
  Message,
  Settings,
  ContextPack,
  RoutingRule,
  LayoutPreset,
  getWorkspaces,
  saveWorkspace,
  deleteWorkspace as deleteWorkspaceStorage,
  getThreadsByWorkspace,
  saveThread,
  deleteThread as deleteThreadStorage,
  getMessagesByThread,
  saveMessage as saveMessageStorage,
  getSettings,
  saveSettings,
  getContextPacks,
  saveContextPack as saveContextPackStorage,
  deleteContextPack as deleteContextPackStorage,
  getRoutingRules,
  saveRoutingRules,
  searchAll,
  generateId,
  getEncryptedApiKeys,
  setEncryptedApiKeys,
  hasApiKeysStored,
  clearAllData,
} from '@/lib/storage';
import { encrypt, decrypt, getCachedPassphrase, cachePassphrase, setPassphraseUnlocked } from '@/lib/crypto';

export type Preset = 'research' | 'code' | 'operator';

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
}

interface AppState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  threads: Thread[];
  currentThread: Thread | null;
  messages: Message[];
  settings: Settings;
  apiKeys: ApiKeys;
  isUnlocked: boolean;
  hasStoredKeys: boolean;
  preset: Preset;
  contextPacks: ContextPack[];
  routingRules: RoutingRule[];
  attachedContextPacks: string[];
}

interface AppContextType extends AppState {
  // Workspace actions
  createWorkspace: (name: string, preset?: Preset) => Workspace;
  updateWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (id: string) => void;
  selectWorkspace: (id: string) => void;
  
  // Thread actions
  createThread: (title?: string) => Thread;
  updateThread: (thread: Thread) => void;
  deleteThread: (id: string) => void;
  selectThread: (id: string) => void;
  markThreadAsRead: (id: string) => void;
  
  // Message actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Message;
  
  // Settings
  updateSettings: (settings: Partial<Settings>) => void;
  setLayoutPreset: (preset: LayoutPreset) => void;
  
  // API Keys
  unlockVault: (passphrase: string) => Promise<boolean>;
  lockVault: () => void;
  saveApiKeys: (keys: ApiKeys, passphrase: string) => Promise<void>;
  
  // Preset
  setPreset: (preset: Preset) => void;
  
  // Context Packs
  addContextPack: (pack: Omit<ContextPack, 'id' | 'createdAt' | 'updatedAt'>) => ContextPack;
  updateContextPack: (pack: ContextPack) => void;
  deleteContextPack: (id: string) => void;
  toggleContextPackAttachment: (id: string) => void;
  
  // Routing Rules
  updateRoutingRules: (rules: RoutingRule[]) => void;
  
  // Search
  search: (query: string) => { threads: Thread[]; messages: Message[] };
  
  // Data management
  clearData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const PRESET_DEFAULTS: Record<Preset, { systemPrompt: string; models: string[] }> = {
  research: {
    systemPrompt: 'You are a research assistant helping with academic writing, synthesis, and analysis. Be thorough, cite sources when possible, and structure your responses clearly.',
    models: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet-20241022'],
  },
  code: {
    systemPrompt: 'You are a senior software engineer. Write clean, well-documented code. Explain your reasoning. Follow best practices and consider edge cases.',
    models: ['anthropic:claude-3-5-sonnet-20241022', 'openai:gpt-4o'],
  },
  operator: {
    systemPrompt: 'You are a strategic advisor helping founders and product managers draft communications, analyze decisions, and structure thoughts. Be concise and actionable.',
    models: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet-20241022'],
  },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasStoredKeys, setHasStoredKeys] = useState(hasApiKeysStored());
  const [preset, setPresetState] = useState<Preset>('research');
  const [contextPacks, setContextPacks] = useState<ContextPack[]>([]);
  const [routingRules, setRoutingRulesState] = useState<RoutingRule[]>([]);
  const [attachedContextPacks, setAttachedContextPacks] = useState<string[]>([]);

  // Initialize
  useEffect(() => {
    const storedWorkspaces = getWorkspaces();
    setWorkspaces(storedWorkspaces);
    setContextPacks(getContextPacks());
    setRoutingRulesState(getRoutingRules());
    
    // Auto-unlock if passphrase is cached
    const cached = getCachedPassphrase();
    if (cached && hasApiKeysStored()) {
      unlockVault(cached);
    }
    
    // Select first workspace or create default
    if (storedWorkspaces.length > 0) {
      selectWorkspace(storedWorkspaces[0].id);
    }
  }, []);

  const selectWorkspace = useCallback((id: string) => {
    const storedWorkspaces = getWorkspaces();
    const workspace = storedWorkspaces.find(w => w.id === id);
    if (workspace) {
      setCurrentWorkspace(workspace);
      setPresetState(workspace.preset);
      const workspaceThreads = getThreadsByWorkspace(id);
      setThreads(workspaceThreads);
      if (workspaceThreads.length > 0) {
        const thread = workspaceThreads[0];
        setCurrentThread(thread);
        setMessages(getMessagesByThread(thread.id));
      } else {
        setCurrentThread(null);
        setMessages([]);
      }
    }
  }, []);

  const selectThread = useCallback((id: string) => {
    const allThreads = getThreadsByWorkspace(currentWorkspace?.id || '');
    const thread = allThreads.find(t => t.id === id);
    if (thread) {
      setCurrentThread(thread);
      setMessages(getMessagesByThread(id));
      // Mark as read
      if (thread.unread) {
        const updatedThread = { ...thread, unread: false, lastReadAt: new Date().toISOString() };
        saveThread(updatedThread);
        setThreads(prev => prev.map(t => t.id === id ? updatedThread : t));
      }
    }
  }, [currentWorkspace]);

  const markThreadAsRead = useCallback((id: string) => {
    const thread = threads.find(t => t.id === id);
    if (thread && thread.unread) {
      const updatedThread = { ...thread, unread: false, lastReadAt: new Date().toISOString() };
      saveThread(updatedThread);
      setThreads(prev => prev.map(t => t.id === id ? updatedThread : t));
    }
  }, [threads]);

  const createWorkspace = useCallback((name: string, presetType: Preset = 'research') => {
    const defaults = PRESET_DEFAULTS[presetType];
    const workspace: Workspace = {
      id: generateId(),
      name,
      systemPrompt: defaults.systemPrompt,
      defaultModels: defaults.models,
      templateVars: {},
      preset: presetType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveWorkspace(workspace);
    setWorkspaces(prev => [...prev, workspace]);
    selectWorkspace(workspace.id);
    return workspace;
  }, [selectWorkspace]);

  const updateWorkspace = useCallback((workspace: Workspace) => {
    saveWorkspace(workspace);
    setWorkspaces(prev => prev.map(w => w.id === workspace.id ? workspace : w));
    if (currentWorkspace?.id === workspace.id) {
      setCurrentWorkspace(workspace);
    }
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback((id: string) => {
    deleteWorkspaceStorage(id);
    setWorkspaces(prev => {
      const updated = prev.filter(w => w.id !== id);
      if (currentWorkspace?.id === id && updated.length > 0) {
        selectWorkspace(updated[0].id);
      }
      return updated;
    });
  }, [currentWorkspace, selectWorkspace]);

  const createThread = useCallback((title?: string) => {
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }
    const thread: Thread = {
      id: generateId(),
      workspaceId: currentWorkspace.id,
      title: title || 'New Thread',
      tags: [],
      pinned: false,
      unread: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveThread(thread);
    setThreads(prev => [thread, ...prev]);
    selectThread(thread.id);
    return thread;
  }, [currentWorkspace, selectThread]);

  const updateThread = useCallback((thread: Thread) => {
    saveThread(thread);
    setThreads(prev => prev.map(t => t.id === thread.id ? thread : t));
    if (currentThread?.id === thread.id) {
      setCurrentThread(thread);
    }
  }, [currentThread]);

  const deleteThread = useCallback((id: string) => {
    deleteThreadStorage(id);
    setThreads(prev => {
      const updated = prev.filter(t => t.id !== id);
      if (currentThread?.id === id && updated.length > 0) {
        selectThread(updated[0].id);
      } else if (currentThread?.id === id) {
        setCurrentThread(null);
        setMessages([]);
      }
      return updated;
    });
  }, [currentThread, selectThread]);

  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'createdAt'>) => {
    const message: Message = {
      ...messageData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    saveMessageStorage(message);
    setMessages(prev => [...prev, message]);
    
    // Update thread timestamp and mark as unread if assistant message
    if (currentThread) {
      const updates: Partial<Thread> = { updatedAt: new Date().toISOString() };
      if (messageData.role === 'assistant') {
        updates.unread = true;
      }
      const updatedThread = { ...currentThread, ...updates };
      saveThread(updatedThread);
      setThreads(prev => prev.map(t => t.id === currentThread.id ? updatedThread : t));
      setCurrentThread(updatedThread);
    }
    
    return message;
  }, [currentThread]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    saveSettings(updated);
    setSettings(updated);
  }, [settings]);

  const setLayoutPreset = useCallback((layoutPreset: LayoutPreset) => {
    let newSettings: Partial<Settings> = { layoutPreset };
    
    switch (layoutPreset) {
      case 'single':
        newSettings = { ...newSettings, showLeftPane: true, showRightPane: false };
        break;
      case 'split':
        newSettings = { ...newSettings, showLeftPane: true, showRightPane: true };
        break;
      case 'compare':
        newSettings = { ...newSettings, showLeftPane: false, showRightPane: true };
        break;
      case 'focus':
        newSettings = { ...newSettings, showLeftPane: false, showRightPane: false };
        break;
    }
    
    updateSettings(newSettings);
  }, [updateSettings]);

  const unlockVault = useCallback(async (passphrase: string): Promise<boolean> => {
    try {
      const encrypted = getEncryptedApiKeys();
      if (!encrypted) {
        cachePassphrase(passphrase);
        setIsUnlocked(true);
        return true;
      }
      
      const decrypted = await decrypt(encrypted, passphrase);
      const keys = JSON.parse(decrypted);
      setApiKeys(keys);
      cachePassphrase(passphrase);
      setIsUnlocked(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const lockVault = useCallback(() => {
    setApiKeys({});
    setIsUnlocked(false);
    setPassphraseUnlocked(false);
  }, []);

  const saveApiKeysCallback = useCallback(async (keys: ApiKeys, passphrase: string) => {
    const encrypted = await encrypt(JSON.stringify(keys), passphrase);
    setEncryptedApiKeys(encrypted);
    setApiKeys(keys);
    cachePassphrase(passphrase);
    setIsUnlocked(true);
    setHasStoredKeys(true);
  }, []);

  const setPreset = useCallback((newPreset: Preset) => {
    setPresetState(newPreset);
    if (currentWorkspace) {
      const defaults = PRESET_DEFAULTS[newPreset];
      updateWorkspace({
        ...currentWorkspace,
        preset: newPreset,
        systemPrompt: defaults.systemPrompt,
        defaultModels: defaults.models,
      });
    }
  }, [currentWorkspace, updateWorkspace]);

  // Context Packs
  const addContextPack = useCallback((packData: Omit<ContextPack, 'id' | 'createdAt' | 'updatedAt'>) => {
    const pack: ContextPack = {
      ...packData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveContextPackStorage(pack);
    setContextPacks(prev => [...prev, pack]);
    return pack;
  }, []);

  const updateContextPack = useCallback((pack: ContextPack) => {
    saveContextPackStorage(pack);
    setContextPacks(prev => prev.map(p => p.id === pack.id ? pack : p));
  }, []);

  const deleteContextPack = useCallback((id: string) => {
    deleteContextPackStorage(id);
    setContextPacks(prev => prev.filter(p => p.id !== id));
    setAttachedContextPacks(prev => prev.filter(pid => pid !== id));
  }, []);

  const toggleContextPackAttachment = useCallback((id: string) => {
    setAttachedContextPacks(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  }, []);

  // Routing Rules
  const updateRoutingRules = useCallback((rules: RoutingRule[]) => {
    saveRoutingRules(rules);
    setRoutingRulesState(rules);
  }, []);

  // Search
  const search = useCallback((query: string) => {
    return searchAll(query, currentWorkspace?.id);
  }, [currentWorkspace]);

  const clearData = useCallback(() => {
    clearAllData();
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setThreads([]);
    setCurrentThread(null);
    setMessages([]);
    setApiKeys({});
    setIsUnlocked(false);
    setHasStoredKeys(false);
    setContextPacks([]);
    setRoutingRulesState([]);
    setAttachedContextPacks([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        threads,
        currentThread,
        messages,
        settings,
        apiKeys,
        isUnlocked,
        hasStoredKeys,
        preset,
        contextPacks,
        routingRules,
        attachedContextPacks,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        selectWorkspace,
        createThread,
        updateThread,
        deleteThread,
        selectThread,
        markThreadAsRead,
        addMessage,
        updateSettings,
        setLayoutPreset,
        unlockVault,
        lockVault,
        saveApiKeys: saveApiKeysCallback,
        setPreset,
        addContextPack,
        updateContextPack,
        deleteContextPack,
        toggleContextPackAttachment,
        updateRoutingRules,
        search,
        clearData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
