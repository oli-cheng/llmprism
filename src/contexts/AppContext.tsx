import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  Thread,
  Message,
  Settings,
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
  generateId,
  getEncryptedApiKeys,
  setEncryptedApiKeys,
  hasApiKeysStored,
  clearAllData,
} from '@/lib/storage';
import { encrypt, decrypt, getCachedPassphrase, cachePassphrase, setPassphraseUnlocked, isPassphraseSet } from '@/lib/crypto';

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
  
  // Message actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Message;
  
  // Settings
  updateSettings: (settings: Partial<Settings>) => void;
  
  // API Keys
  unlockVault: (passphrase: string) => Promise<boolean>;
  lockVault: () => void;
  saveApiKeys: (keys: ApiKeys, passphrase: string) => Promise<void>;
  
  // Preset
  setPreset: (preset: Preset) => void;
  
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

  // Initialize
  useEffect(() => {
    const storedWorkspaces = getWorkspaces();
    setWorkspaces(storedWorkspaces);
    
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
    const workspace = workspaces.find(w => w.id === id);
    if (workspace) {
      setCurrentWorkspace(workspace);
      setPresetState(workspace.preset);
      const workspaceThreads = getThreadsByWorkspace(id);
      setThreads(workspaceThreads);
      if (workspaceThreads.length > 0) {
        selectThread(workspaceThreads[0].id);
      } else {
        setCurrentThread(null);
        setMessages([]);
      }
    }
  }, [workspaces]);

  const selectThread = useCallback((id: string) => {
    const thread = threads.find(t => t.id === id);
    if (thread) {
      setCurrentThread(thread);
      setMessages(getMessagesByThread(id));
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
    
    // Update thread timestamp
    if (currentThread) {
      updateThread({ ...currentThread, updatedAt: new Date().toISOString() });
    }
    
    return message;
  }, [currentThread, updateThread]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    saveSettings(updated);
    setSettings(updated);
  }, [settings]);

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

  const saveApiKeys = useCallback(async (keys: ApiKeys, passphrase: string) => {
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
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        selectWorkspace,
        createThread,
        updateThread,
        deleteThread,
        selectThread,
        addMessage,
        updateSettings,
        unlockVault,
        lockVault,
        saveApiKeys,
        setPreset,
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
