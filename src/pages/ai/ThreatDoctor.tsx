import { useState, useRef, useEffect } from 'react';
import { useThreatDoctorChat, Message, Conversation } from '@/hooks/useThreatDoctorChat';
import { MarkdownMessage } from '@/components/ai/MarkdownMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Trash2, 
  Bot, 
  User, 
  Sparkles,
  Shield,
  Globe,
  FileSearch,
  AlertTriangle,
  Loader2,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

const SUGGESTED_PROMPTS = [
  { icon: Shield, text: 'How do I protect against DDoS attacks?' },
  { icon: Globe, text: 'Explain common web vulnerabilities' },
  { icon: FileSearch, text: 'How to use the website scanner?' },
  { icon: AlertTriangle, text: 'What should I do after detecting a breach?' },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      'flex gap-3 p-4 rounded-lg animate-fade-in',
      isUser ? 'bg-primary/10' : 'bg-muted/50'
    )}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn(
          isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {isUser ? 'You' : 'ThreatDoctor'} • {message.timestamp.toLocaleTimeString()}
        </p>
        {isUser ? (
          <p className="whitespace-pre-wrap text-foreground leading-relaxed">{message.content}</p>
        ) : (
          <MarkdownMessage content={message.content} />
        )}
      </div>
    </div>
  );
}

function ConversationSidebar({ 
  conversations, 
  currentConversationId,
  isLoading,
  onSelect, 
  onDelete,
  onNewChat,
  isCollapsed,
  onToggle
}: { 
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn(
      "border-r border-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-12" : "w-64"
    )}>
      <div className="p-2 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2 mr-2"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="flex-shrink-0">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                    currentConversationId === conv.id && "bg-muted"
                  )}
                  onClick={() => onSelect(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function EmptyState({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">AI ThreatDoctor</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Your intelligent cybersecurity assistant. Ask me about threats, platform features, 
        security best practices, or get help with incident response.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-auto py-3 px-4 justify-start text-left gap-3 hover:bg-primary/10 hover:border-primary/50"
            onClick={() => onPromptClick(prompt.text)}
          >
            <prompt.icon className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm">{prompt.text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function ThreatDoctor() {
  const { 
    messages, 
    conversations,
    currentConversationId,
    isLoading, 
    isLoadingConversations,
    sendMessage, 
    startNewChat,
    loadConversation,
    deleteConversation
  } = useThreatDoctorChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (text: string) => {
    sendMessage(text);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex">
      {/* Sidebar - only show if logged in */}
      {user && (
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          isLoading={isLoadingConversations}
          onSelect={loadConversation}
          onDelete={deleteConversation}
          onNewChat={startNewChat}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 px-4 pt-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI ThreatDoctor</h1>
              <p className="text-sm text-muted-foreground">
                {user ? 'Intelligent Cybersecurity Assistant' : 'Sign in to save conversations'}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={startNewChat} className="gap-2">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <EmptyState onPromptClick={handlePromptClick} />
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3 p-4 rounded-lg bg-muted/50 animate-fade-in">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">ThreatDoctor is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ThreatDoctor about security threats, platform features, or get recommendations..."
                className="min-h-[52px] max-h-[200px] resize-none pr-12"
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              size="icon"
              className="h-[52px] w-[52px]"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
