import React, { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useApp, Preset } from '@/contexts/AppContext';
import {
  Plus,
  Folder,
  MessageSquare,
  Settings,
  Trash2,
  Play,
  FileText,
  Sparkles,
  Code2,
  Briefcase,
  PanelLeft,
  PanelRight,
  Lock,
  Unlock,
} from 'lucide-react';

interface CommandPaletteProps {
  onOpenSettings: () => void;
}

export function CommandPalette({ onOpenSettings }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const {
    workspaces,
    selectWorkspace,
    createWorkspace,
    createThread,
    currentWorkspace,
    settings,
    updateSettings,
    setPreset,
    isUnlocked,
    lockVault,
    clearData,
  } = useApp();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (action: string) => {
    setOpen(false);

    switch (action) {
      case 'new-workspace':
        const name = prompt('Workspace name:');
        if (name) createWorkspace(name);
        break;
      case 'new-thread':
        if (currentWorkspace) createThread();
        break;
      case 'settings':
        onOpenSettings();
        break;
      case 'toggle-left':
        updateSettings({ showLeftPane: !settings.showLeftPane });
        break;
      case 'toggle-right':
        updateSettings({ showRightPane: !settings.showRightPane });
        break;
      case 'preset-research':
        setPreset('research');
        break;
      case 'preset-code':
        setPreset('code');
        break;
      case 'preset-operator':
        setPreset('operator');
        break;
      case 'lock':
        lockVault();
        break;
      case 'clear-data':
        if (confirm('This will delete ALL local data including workspaces, threads, and API keys. Continue?')) {
          clearData();
        }
        break;
    }
  };

  const handleSelectWorkspace = (id: string) => {
    setOpen(false);
    selectWorkspace(id);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect('new-workspace')}>
            <Folder className="mr-2 h-4 w-4" />
            New Workspace
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect('new-thread')}
            disabled={!currentWorkspace}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            New Thread
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Open Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Presets">
          <CommandItem onSelect={() => handleSelect('preset-research')}>
            <Sparkles className="mr-2 h-4 w-4 text-blue-400" />
            Research Desk
            <span className="ml-auto text-xs text-muted-foreground">⌘1</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('preset-code')}>
            <Code2 className="mr-2 h-4 w-4 text-green-400" />
            Code Bench
            <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('preset-operator')}>
            <Briefcase className="mr-2 h-4 w-4 text-orange-400" />
            Operator Inbox
            <span className="ml-auto text-xs text-muted-foreground">⌘3</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="View">
          <CommandItem onSelect={() => handleSelect('toggle-left')}>
            <PanelLeft className="mr-2 h-4 w-4" />
            Toggle Left Pane
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('toggle-right')}>
            <PanelRight className="mr-2 h-4 w-4" />
            Toggle Right Pane
          </CommandItem>
        </CommandGroup>

        {workspaces.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Workspaces">
              {workspaces.map(workspace => (
                <CommandItem
                  key={workspace.id}
                  onSelect={() => handleSelectWorkspace(workspace.id)}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {workspace.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Security">
          {isUnlocked ? (
            <CommandItem onSelect={() => handleSelect('lock')}>
              <Lock className="mr-2 h-4 w-4" />
              Lock Vault
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => handleSelect('settings')}>
              <Unlock className="mr-2 h-4 w-4" />
              Unlock Vault
            </CommandItem>
          )}
          <CommandItem
            onSelect={() => handleSelect('clear-data')}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Local Data
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
