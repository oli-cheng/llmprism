import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import {
  Settings,
  Command,
  Shield,
  ShieldOff,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { isUnlocked, settings, updateSettings, currentWorkspace } = useApp();

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">P</span>
          </div>
          <span className="font-semibold tracking-tight">Prism</span>
        </div>
        {currentWorkspace && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{currentWorkspace.name}</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Security Status */}
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 text-xs',
            isUnlocked ? 'text-success border-success/30' : 'text-muted-foreground'
          )}
        >
          {isUnlocked ? (
            <>
              <Shield className="h-3 w-3" />
              Unlocked
            </>
          ) : (
            <>
              <ShieldOff className="h-3 w-3" />
              Locked
            </>
          )}
        </Badge>

        {/* Command Palette Hint */}
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
          <Command className="h-3 w-3" />
          <span className="text-xs">K</span>
        </Button>

        {/* Pane Toggles */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', !settings.showLeftPane && 'text-muted-foreground')}
          onClick={() => updateSettings({ showLeftPane: !settings.showLeftPane })}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', !settings.showRightPane && 'text-muted-foreground')}
          onClick={() => updateSettings({ showRightPane: !settings.showRightPane })}
        >
          <PanelRight className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
