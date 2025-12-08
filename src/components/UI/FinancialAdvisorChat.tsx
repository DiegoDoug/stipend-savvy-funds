import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Loader2, TrendingUp, PiggyBank, Target, HelpCircle, RotateCcw, History, Trash2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatConversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

type StoredChats = {
  activeConversationId: string | null;
  conversations: ChatConversation[];
};

const STORAGE_KEY = 'fintrack-advisor-chats';
const MAX_CONVERSATIONS = 10;

export type SuggestedGoal = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string;
};

export type FinancialContext = {
  transactions: Array<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    date: string;
    receipt_url?: string | null;
  }>;
  budgets: Array<{
    category: string;
    allocated: number;
    spent: number;
    last_reset?: string;
  }>;
  goals: Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    description: string | null;
    status: string;
  }>;
  refunds: Array<{
    id: string;
    source: string;
    amount: number;
    date: string;
    status: 'pending' | 'received';
  }>;
  customCategories: Array<{
    name: string;
    label: string;
    type: string;
  }>;
  stats: {
    balance: number;
    savings: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    totalBudget: number;
    totalSpent: number;
    incomeChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
    expenseChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  };
};

interface FinancialAdvisorChatProps {
  financialContext: FinancialContext;
  onCreateGoal?: (goal: SuggestedGoal) => void;
}

// Parse goal suggestions from AI response
const parseGoalSuggestions = (content: string): SuggestedGoal[] => {
  const goals: SuggestedGoal[] = [];
  
  // Match patterns like [GOAL: name | $amount | description]
  const goalPattern = /\[GOAL:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*(?:\|\s*([^\]]+))?\]/gi;
  let match;
  
  while ((match = goalPattern.exec(content)) !== null) {
    const name = match[1].trim();
    const amount = parseFloat(match[2].replace(/,/g, ''));
    const description = match[3]?.trim();
    
    if (name && !isNaN(amount) && amount > 0) {
      goals.push({
        name,
        targetAmount: amount,
        description,
      });
    }
  }
  
  return goals;
};

// Remove goal markers from content for display
const cleanContent = (content: string): string => {
  return content.replace(/\[GOAL:\s*[^\]]+\]/gi, '').trim();
};

const quickPrompts = [
  { icon: TrendingUp, label: "Analyze spending", prompt: "Analyze my spending patterns and tell me where I'm spending the most. Include specific transaction details." },
  { icon: PiggyBank, label: "Save more", prompt: "How can I save more money based on my current spending? Give me specific recommendations." },
  { icon: Target, label: "Suggest a goal", prompt: "Based on my finances, suggest a realistic savings goal I should create with specific amounts and timeline." },
  { icon: HelpCircle, label: "Financial tips", prompt: "Give me 3 personalized tips to improve my financial health based on my transaction history." },
];

// Helper functions for localStorage
const loadStoredChats = (): StoredChats => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load chats from localStorage:', error);
  }
  return { activeConversationId: null, conversations: [] };
};

const saveStoredChats = (data: StoredChats) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save chats to localStorage:', error);
  }
};

const generateConversationTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const title = firstUserMessage.content.slice(0, 35);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  }
  return 'New Chat';
};

const FinancialAdvisorChat: React.FC<FinancialAdvisorChatProps> = ({ financialContext, onCreateGoal }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    const stored = loadStoredChats();
    setConversations(stored.conversations);
    
    if (stored.activeConversationId) {
      const activeConvo = stored.conversations.find(c => c.id === stored.activeConversationId);
      if (activeConvo) {
        setActiveConversationId(activeConvo.id);
        setMessages(activeConvo.messages);
      }
    }
  }, []);

  // Save conversations when they change
  const saveConversations = useCallback((convos: ChatConversation[], activeId: string | null) => {
    saveStoredChats({
      activeConversationId: activeId,
      conversations: convos,
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createNewConversation = useCallback(() => {
    const newConvo: ChatConversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    let updatedConversations = [newConvo, ...conversations];
    
    // Limit to MAX_CONVERSATIONS
    if (updatedConversations.length > MAX_CONVERSATIONS) {
      updatedConversations = updatedConversations.slice(0, MAX_CONVERSATIONS);
    }
    
    setConversations(updatedConversations);
    setActiveConversationId(newConvo.id);
    setMessages([]);
    saveConversations(updatedConversations, newConvo.id);
    
    return newConvo.id;
  }, [conversations, saveConversations]);

  const updateCurrentConversation = useCallback((newMessages: Message[]) => {
    if (!activeConversationId) return;
    
    const updatedConversations = conversations.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: newMessages,
          title: generateConversationTitle(newMessages),
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    
    setConversations(updatedConversations);
    saveConversations(updatedConversations, activeConversationId);
  }, [activeConversationId, conversations, saveConversations]);

  const switchConversation = (conversationId: string) => {
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      setActiveConversationId(convo.id);
      setMessages(convo.messages);
      saveConversations(conversations, convo.id);
    }
  };

  const deleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    
    if (activeConversationId === conversationId) {
      if (updatedConversations.length > 0) {
        setActiveConversationId(updatedConversations[0].id);
        setMessages(updatedConversations[0].messages);
        saveConversations(updatedConversations, updatedConversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
        saveConversations(updatedConversations, null);
      }
    } else {
      saveConversations(updatedConversations, activeConversationId);
    }
  };

  const clearAllHistory = () => {
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    saveConversations([], null);
  };

  const streamChat = async (userMessage: string) => {
    // Create new conversation if none exists
    let currentConvoId = activeConversationId;
    if (!currentConvoId) {
      currentConvoId = createNewConversation();
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          financialContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message to update
      const messagesWithAssistant = [...newMessages, { role: 'assistant' as const, content: '' }];
      setMessages(messagesWithAssistant);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }

      // Save conversation after response completes
      const finalMessages = [...newMessages, { role: 'assistant' as const, content: assistantContent }];
      
      // Update conversation in state and storage
      const updatedConversations = conversations.map(c => {
        if (c.id === currentConvoId) {
          return {
            ...c,
            messages: finalMessages,
            title: generateConversationTitle(finalMessages),
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      
      // If this was a new conversation, add it
      if (!conversations.find(c => c.id === currentConvoId)) {
        const newConvo: ChatConversation = {
          id: currentConvoId,
          title: generateConversationTitle(finalMessages),
          messages: finalMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        let newConversations = [newConvo, ...conversations];
        if (newConversations.length > MAX_CONVERSATIONS) {
          newConversations = newConversations.slice(0, MAX_CONVERSATIONS);
        }
        setConversations(newConversations);
        saveConversations(newConversations, currentConvoId);
      } else {
        setConversations(updatedConversations);
        saveConversations(updatedConversations, currentConvoId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        { role: 'assistant', content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    streamChat(prompt);
  };

  const handleNewChat = () => {
    createNewConversation();
  };

  return (
    <Card className="flex flex-col h-full border-border/50">
      {/* Header */}
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Financial Advisor</h3>
            <p className="text-xs text-muted-foreground">AI-powered savings assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* History Dropdown */}
          {conversations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <History className="h-4 w-4 mr-1" />
                  History
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                    {conversations.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-popover">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Recent Conversations
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-64">
                  {conversations.map((convo) => (
                    <DropdownMenuItem
                      key={convo.id}
                      className={cn(
                        "flex items-center justify-between cursor-pointer",
                        activeConversationId === convo.id && "bg-accent"
                      )}
                      onClick={() => switchConversation(convo.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{convo.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(convo.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2 hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => deleteConversation(convo.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={clearAllHistory}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* New Chat Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Hi! I'm your financial advisor. Ask me about your spending, savings goals, or get personalized tips.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((qp, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 px-3 text-left justify-start gap-2 text-xs hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  disabled={isLoading}
                >
                  <qp.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{qp.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const suggestedGoals = msg.role === 'assistant' ? parseGoalSuggestions(msg.content) : [];
              const displayContent = msg.role === 'assistant' ? cleanContent(msg.content) : msg.content;
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    {displayContent || (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </span>
                    )}
                  </div>
                  
                  {/* Suggested Goals Buttons */}
                  {suggestedGoals.length > 0 && onCreateGoal && (
                    <div className="flex flex-wrap gap-2 mt-2 max-w-[85%]">
                      {suggestedGoals.map((goal, goalIndex) => (
                        <Button
                          key={goalIndex}
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-8 border-primary/50 hover:bg-primary/10 hover:border-primary"
                          onClick={() => onCreateGoal(goal)}
                        >
                          <Plus className="h-3 w-3" />
                          Create: {goal.name} (${goal.targetAmount.toLocaleString()})
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FinancialAdvisorChat;
