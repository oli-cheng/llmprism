import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Code2,
  StickyNote,
  MoreHorizontal,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ContextPack } from '@/lib/storage';

const TYPE_ICONS = {
  note: StickyNote,
  document: FileText,
  code: Code2,
};

const TYPE_COLORS = {
  note: 'text-yellow-400',
  document: 'text-blue-400',
  code: 'text-green-400',
};

export function ContextPacksSidebar() {
  const {
    contextPacks,
    attachedContextPacks,
    addContextPack,
    updateContextPack,
    deleteContextPack,
    toggleContextPackAttachment,
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPack, setNewPack] = useState({
    name: '',
    content: '',
    type: 'note' as ContextPack['type'],
  });

  const handleCreate = () => {
    if (!newPack.name.trim() || !newPack.content.trim()) return;
    addContextPack(newPack);
    setNewPack({ name: '', content: '', type: 'note' });
    setIsCreating(false);
  };

  const handleUpdate = (pack: ContextPack) => {
    updateContextPack(pack);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-l border-sidebar-border">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Context Packs
          </span>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Context Pack</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Name"
                    value={newPack.name}
                    onChange={e => setNewPack(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Select
                    value={newPack.type}
                    onValueChange={(v: ContextPack['type']) => setNewPack(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Content..."
                  value={newPack.content}
                  onChange={e => setNewPack(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[200px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          Attach saved notes or documents to prompts
        </p>
      </div>

      {/* Packs List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {contextPacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No context packs yet</p>
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setIsCreating(true)}
              >
                Create one
              </Button>
            </div>
          ) : (
            contextPacks.map(pack => {
              const Icon = TYPE_ICONS[pack.type];
              const isAttached = attachedContextPacks.includes(pack.id);
              const isEditing = editingId === pack.id;

              if (isEditing) {
                return (
                  <div key={pack.id} className="p-3 rounded-lg border border-primary bg-muted/30 space-y-2">
                    <Input
                      value={pack.name}
                      onChange={e => updateContextPack({ ...pack, name: e.target.value })}
                      className="h-8"
                    />
                    <Textarea
                      value={pack.content}
                      onChange={e => updateContextPack({ ...pack, content: e.target.value })}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={pack.id}
                  className={cn(
                    'group p-3 rounded-lg border cursor-pointer transition-all',
                    isAttached
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => toggleContextPackAttachment(pack.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('h-4 w-4 mt-0.5', TYPE_COLORS[pack.type])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{pack.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {pack.type}
                        </Badge>
                        {isAttached && (
                          <Badge variant="default" className="text-[10px]">
                            Attached
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {pack.content}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            setEditingId(pack.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={e => {
                            e.stopPropagation();
                            deleteContextPack(pack.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
