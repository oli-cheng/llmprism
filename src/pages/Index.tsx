import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { ContextPacksSidebar } from '@/components/ContextPacksSidebar';
import { PromptEditor } from '@/components/PromptEditor';
import { ResponsePane } from '@/components/ResponsePane';
import { Header } from '@/components/Header';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsDialog } from '@/components/SettingsDialog';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { RoutingRulesEditor } from '@/components/RoutingRulesEditor';
import { ModelResponse } from '@/lib/model-adapters';
import { cn } from '@/lib/utils';

function AppContent() {
  const { workspaces, settings, setPreset, setLayoutPreset } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [routingRulesOpen, setRoutingRulesOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [responses, setResponses] = useState<ModelResponse[]>([]);

  // Show onboarding if no workspaces
  useEffect(() => {
    if (workspaces.length === 0) {
      setShowOnboarding(true);
    }
  }, [workspaces]);

  // Keyboard shortcuts for presets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setPreset('research');
            break;
          case '2':
            e.preventDefault();
            setPreset('code');
            break;
          case '3':
            e.preventDefault();
            setPreset('operator');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setPreset]);

  // Layout calculations based on preset
  const showLeft = settings.showLeftPane && settings.layoutPreset !== 'focus' && settings.layoutPreset !== 'compare';
  const showRight = settings.showRightPane && settings.layoutPreset !== 'focus' && settings.layoutPreset !== 'single';
  const showContextPacks = settings.layoutPreset === 'compare';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header 
        onOpenSettings={() => setSettingsOpen(true)} 
        onOpenRoutingRules={() => setRoutingRulesOpen(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <div
          className={cn(
            'w-64 shrink-0 panel-transition',
            !showLeft && 'w-0 overflow-hidden'
          )}
        >
          <Sidebar />
        </div>

        {/* Center Pane */}
        <div className="flex-1 min-w-0 border-x border-border">
          <PromptEditor onResponses={setResponses} />
        </div>

        {/* Right Pane - Response */}
        <div
          className={cn(
            'shrink-0 panel-transition',
            showRight ? 'w-[420px]' : 'w-0 overflow-hidden'
          )}
        >
          <ResponsePane responses={responses} />
        </div>

        {/* Context Packs Sidebar (Compare mode) */}
        <div
          className={cn(
            'w-64 shrink-0 panel-transition',
            !showContextPacks && 'w-0 overflow-hidden'
          )}
        >
          <ContextPacksSidebar />
        </div>
      </div>

      <CommandPalette 
        onOpenSettings={() => setSettingsOpen(true)} 
        onOpenRoutingRules={() => setRoutingRulesOpen(true)}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <RoutingRulesEditor open={routingRulesOpen} onOpenChange={setRoutingRulesOpen} />
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
