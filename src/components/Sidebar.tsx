import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Folder,
  Plus,
  Search,
  Pin,
  MoreHorizontal,
  Trash2,
  Edit2,
  MessageSquare,
  FolderPlus,
  Tag,
  Circle,
  FileText,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const {
    workspaces,
    currentWorkspace,
    threads,
    currentThread,
    selectWorkspace,
    selectThread,
    createWorkspace,
    createThread,
    deleteWorkspace,
    deleteThread,
    updateThread,
    search,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagThreadId, setTagThreadId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  // Search across threads and message content
  const searchResults = searchQuery ? search(searchQuery) : null;
  const filteredThreads = searchResults?.threads || threads.filter(
    t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateWorkspace = () => {
    const name = prompt('Workspace name:');
    if (name) {
      createWorkspace(name);
    }
  };

  const handleRenameThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread && editTitle.trim()) {
      updateThread({ ...thread, title: editTitle.trim() });
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleAddTag = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread && newTag.trim() && !thread.tags.includes(newTag.trim())) {
      updateThread({ ...thread, tags: [...thread.tags, newTag.trim()] });
    }
    setNewTag('');
    setTagDialogOpen(false);
    setTagThreadId(null);
  };

  const handleRemoveTag = (threadId: string, tag: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      updateThread({ ...thread, tags: thread.tags.filter(t => t !== tag) });
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Workspaces Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspaces
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCreateWorkspace}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-32">
          <div className="space-y-0.5">
            {workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={cn(
                  'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                  workspace.id === currentWorkspace?.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
                onClick={() => selectWorkspace(workspace.id)}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate flex-1">{workspace.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteWorkspace(workspace.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Threads Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Threads
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => createThread()}
              disabled={!currentWorkspace}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search threads & messages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm bg-sidebar-accent border-0"
            />
          </div>
          
          {searchQuery && searchResults && (
            <div className="text-xs text-muted-foreground">
              Found {searchResults.threads.length} threads, {searchResults.messages.length} messages
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-0.5">
            {filteredThreads.map(thread => (
              <div
                key={thread.id}
                className={cn(
                  'group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors',
                  thread.id === currentThread?.id
                    ? 'bg-primary/10 text-foreground border-l-2 border-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
                onClick={() => selectThread(thread.id)}
              >
                <div className="relative">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {thread.unread && (
                    <Circle className="absolute -top-1 -right-1 h-2 w-2 fill-primary text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingThreadId === thread.id ? (
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleRenameThread(thread.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameThread(thread.id);
                        if (e.key === 'Escape') setEditingThreadId(null);
                      }}
                      className="h-6 text-sm px-1"
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate block">{thread.title}</span>
                  )}
                  {thread.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {thread.tags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {tag}
                          <button
                            className="ml-1 opacity-0 group-hover:opacity-100"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveTag(thread.id, tag);
                            }}
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {thread.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          updateThread({ ...thread, pinned: !thread.pinned });
                        }}
                      >
                        <Pin className="h-4 w-4 mr-2" />
                        {thread.pinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          setEditTitle(thread.title);
                          setEditingThreadId(thread.id);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <Dialog open={tagDialogOpen && tagThreadId === thread.id} onOpenChange={(open) => {
                        setTagDialogOpen(open);
                        if (!open) setTagThreadId(null);
                      }}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={e => {
                              e.preventDefault();
                              setTagThreadId(thread.id);
                              setTagDialogOpen(true);
                            }}
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            Add Tag
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle>Add Tag</DialogTitle>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Tag name"
                              value={newTag}
                              onChange={e => setNewTag(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddTag(thread.id);
                              }}
                            />
                            <Button onClick={() => handleAddTag(thread.id)}>Add</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={e => {
                          e.stopPropagation();
                          deleteThread(thread.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredThreads.length === 0 && currentWorkspace && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No threads yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => createThread()}
                >
                  Create one
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
