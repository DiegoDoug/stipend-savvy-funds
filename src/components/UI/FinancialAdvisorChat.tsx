import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Loader2, TrendingUp, PiggyBank, Target, HelpCircle, RotateCcw, History, Trash2, X, Plus, MinusCircle, PlusCircle, Pencil, DollarSign, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatMessageBubble from './ChatMessageBubble';
import ChatTypingIndicator from './ChatTypingIndicator';
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
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'fintrack-advisor-last-activity';

export type SuggestedGoal = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string;
};

export type ActionType = 
  | 'create_goal' 
  | 'create_expense' 
  | 'create_income' 
  | 'edit_goal' 
  | 'edit_expense' 
  | 'edit_income'
  | 'create_budget'
  | 'edit_budget'
  | 'delete_budget'
  | 'link_goal_to_budget'
  | 'add_funds_to_goal';

export type SuggestedAction = {
  type: ActionType;
  data: {
    id?: string;
    name?: string;
    description?: string;
    amount?: number;
    targetAmount?: number;
    currentAmount?: number;
    category?: string;
    date?: string;
    targetDate?: string;
    expenseAllocation?: number;
    savingsAllocation?: number;
    linkedGoalName?: string;
    budgetName?: string;
    goalName?: string;
  };
  displayLabel: string;
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
    budget_id?: string | null;
    budget_name?: string | null;
  }>;
  budgets: Array<{
    category: string;
    allocated: number;
    spent: number;
    last_reset?: string;
  }>;
  budgetsList?: Array<{
    id: string;
    name: string;
    description: string | null;
    expense_allocation: number;
    savings_allocation: number;
    expense_spent: number;
    linked_savings_goal_id: string | null;
    linked_goal_name?: string | null;
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
    totalBudgetAllocated?: number;
    remainingToAllocate?: number;
    incomeChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
    expenseChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  };
};

interface FinancialAdvisorChatProps {
  financialContext: FinancialContext;
  standalone?: boolean;
  onCreateGoal?: (goal: SuggestedGoal) => void;
  onCreateExpense?: (expense: { description: string; amount: number; category: string; date: string }) => void;
  onCreateIncome?: (income: { description: string; amount: number; category: string; date: string }) => void;
  onEditGoal?: (id: string, data: { name?: string; currentAmount?: number; targetAmount?: number; targetDate?: string; description?: string }) => void;
  onEditExpense?: (id: string, data: { description?: string; amount?: number; category?: string; date?: string }) => void;
  onEditIncome?: (id: string, data: { description?: string; amount?: number; category?: string; date?: string }) => void;
  // Budget actions
  onCreateBudget?: (budget: { name: string; expenseAllocation: number; savingsAllocation: number; linkedGoalName?: string; description?: string }) => void;
  onEditBudget?: (id: string, data: { name?: string; expenseAllocation?: number; savingsAllocation?: number; linkedGoalName?: string; description?: string }) => void;
  onDeleteBudget?: (id: string, name: string) => void;
  onLinkGoalToBudget?: (budgetName: string, goalName: string) => void;
  onAddFundsToGoal?: (goalName: string, amount: number) => void;
}

// Parse all action types from AI response
const parseAllActions = (content: string): SuggestedAction[] => {
  const actions: SuggestedAction[] = [];
  
  // CREATE_GOAL: Goal Name | $TargetAmount | Description | Target Date
  const createGoalPattern = /\[CREATE_GOAL:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*(?:\|\s*([^|\]]+))?\s*(?:\|\s*(\d{4}-\d{2}-\d{2}))?\s*\]/gi;
  let match;
  
  while ((match = createGoalPattern.exec(content)) !== null) {
    const name = match[1].trim();
    const amount = parseFloat(match[2].replace(/,/g, ''));
    const description = match[3]?.trim();
    const targetDate = match[4]?.trim();
    
    if (name && !isNaN(amount) && amount > 0) {
      actions.push({
        type: 'create_goal',
        data: { name, targetAmount: amount, description, targetDate },
        displayLabel: `Create Goal: ${name} ($${amount.toLocaleString()})`,
      });
    }
  }
  
  // CREATE_EXPENSE: Description | $Amount | Category | Date
  const createExpensePattern = /\[CREATE_EXPENSE:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\]/gi;
  
  while ((match = createExpensePattern.exec(content)) !== null) {
    const description = match[1].trim();
    const amount = parseFloat(match[2].replace(/,/g, ''));
    const category = match[3].trim();
    const date = match[4].trim();
    
    if (description && !isNaN(amount) && amount > 0 && category && date) {
      actions.push({
        type: 'create_expense',
        data: { description, amount, category, date },
        displayLabel: `Add Expense: ${description} ($${amount.toFixed(2)})`,
      });
    }
  }
  
  // CREATE_INCOME: Description | $Amount | Category | Date
  const createIncomePattern = /\[CREATE_INCOME:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\]/gi;
  
  while ((match = createIncomePattern.exec(content)) !== null) {
    const description = match[1].trim();
    const amount = parseFloat(match[2].replace(/,/g, ''));
    const category = match[3].trim();
    const date = match[4].trim();
    
    if (description && !isNaN(amount) && amount > 0 && category && date) {
      actions.push({
        type: 'create_income',
        data: { description, amount, category, date },
        displayLabel: `Add Income: ${description} ($${amount.toFixed(2)})`,
      });
    }
  }
  
  // EDIT_GOAL: id | Goal Name | $CurrentAmount | $TargetAmount | Target Date | Description
  const editGoalPattern = /\[EDIT_GOAL:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*(?:\|\s*(\d{4}-\d{2}-\d{2}))?\s*(?:\|\s*([^|\]]+))?\s*\]/gi;
  
  while ((match = editGoalPattern.exec(content)) !== null) {
    const id = match[1].trim();
    const name = match[2].trim();
    const currentAmount = parseFloat(match[3].replace(/,/g, ''));
    const targetAmount = parseFloat(match[4].replace(/,/g, ''));
    const targetDate = match[5]?.trim();
    const description = match[6]?.trim();
    
    if (id && name && !isNaN(targetAmount)) {
      actions.push({
        type: 'edit_goal',
        data: { id, name, currentAmount, targetAmount, targetDate, description },
        displayLabel: `Update Goal: ${name}`,
      });
    }
  }
  
  // EDIT_EXPENSE: id | Description | $Amount | Category | Date
  const editExpensePattern = /\[EDIT_EXPENSE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\]/gi;
  
  while ((match = editExpensePattern.exec(content)) !== null) {
    const id = match[1].trim();
    const description = match[2].trim();
    const amount = parseFloat(match[3].replace(/,/g, ''));
    const category = match[4].trim();
    const date = match[5].trim();
    
    if (id && description && !isNaN(amount) && category && date) {
      actions.push({
        type: 'edit_expense',
        data: { id, description, amount, category, date },
        displayLabel: `Update Expense: ${description}`,
      });
    }
  }
  
  // EDIT_INCOME: id | Description | $Amount | Category | Date
  const editIncomePattern = /\[EDIT_INCOME:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\]/gi;
  
  while ((match = editIncomePattern.exec(content)) !== null) {
    const id = match[1].trim();
    const description = match[2].trim();
    const amount = parseFloat(match[3].replace(/,/g, ''));
    const category = match[4].trim();
    const date = match[5].trim();
    
    if (id && description && !isNaN(amount) && category && date) {
      actions.push({
        type: 'edit_income',
        data: { id, description, amount, category, date },
        displayLabel: `Update Income: ${description}`,
      });
    }
  }
  
  // CREATE_BUDGET: Budget Name | $ExpenseAllocation | $SavingsAllocation | LinkedGoalName or "none" | Description
  const createBudgetPattern = /\[CREATE_BUDGET:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*(?:\|\s*([^|\]]+))?\s*\]/gi;
  
  while ((match = createBudgetPattern.exec(content)) !== null) {
    const name = match[1].trim();
    const expenseAllocation = parseFloat(match[2].replace(/,/g, ''));
    const savingsAllocation = parseFloat(match[3].replace(/,/g, ''));
    const linkedGoalName = match[4].trim().toLowerCase() === 'none' ? undefined : match[4].trim();
    const description = match[5]?.trim();
    
    if (name && !isNaN(expenseAllocation) && !isNaN(savingsAllocation)) {
      actions.push({
        type: 'create_budget',
        data: { name, expenseAllocation, savingsAllocation, linkedGoalName, description },
        displayLabel: `Create Budget: ${name} ($${(expenseAllocation + savingsAllocation).toLocaleString()})`,
      });
    }
  }
  
  // EDIT_BUDGET: id | Budget Name | $ExpenseAllocation | $SavingsAllocation | LinkedGoalName or "none" | Description
  const editBudgetPattern = /\[EDIT_BUDGET:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\|\s*([^|]+)\s*(?:\|\s*([^|\]]+))?\s*\]/gi;
  
  while ((match = editBudgetPattern.exec(content)) !== null) {
    const id = match[1].trim();
    const name = match[2].trim();
    const expenseAllocation = parseFloat(match[3].replace(/,/g, ''));
    const savingsAllocation = parseFloat(match[4].replace(/,/g, ''));
    const linkedGoalName = match[5].trim().toLowerCase() === 'none' ? undefined : match[5].trim();
    const description = match[6]?.trim();
    
    if (id && name && !isNaN(expenseAllocation) && !isNaN(savingsAllocation)) {
      actions.push({
        type: 'edit_budget',
        data: { id, name, expenseAllocation, savingsAllocation, linkedGoalName, description },
        displayLabel: `Update Budget: ${name}`,
      });
    }
  }
  
  // DELETE_BUDGET: id | Budget Name
  const deleteBudgetPattern = /\[DELETE_BUDGET:\s*([^|]+)\s*\|\s*([^|\]]+)\s*\]/gi;
  
  while ((match = deleteBudgetPattern.exec(content)) !== null) {
    const id = match[1].trim();
    const name = match[2].trim();
    
    if (id && name) {
      actions.push({
        type: 'delete_budget',
        data: { id, name },
        displayLabel: `Delete Budget: ${name}`,
      });
    }
  }
  
  // LINK_GOAL_TO_BUDGET: BudgetName | GoalName
  const linkGoalPattern = /\[LINK_GOAL_TO_BUDGET:\s*([^|]+)\s*\|\s*([^|\]]+)\s*\]/gi;
  
  while ((match = linkGoalPattern.exec(content)) !== null) {
    const budgetName = match[1].trim();
    const goalName = match[2].trim();
    
    if (budgetName && goalName) {
      actions.push({
        type: 'link_goal_to_budget',
        data: { budgetName, goalName },
        displayLabel: `Link "${goalName}" to "${budgetName}"`,
      });
    }
  }
  
  // ADD_FUNDS_TO_GOAL: GoalName | $Amount
  const addFundsPattern = /\[ADD_FUNDS_TO_GOAL:\s*([^|]+)\s*\|\s*\$?([\d,]+(?:\.\d{2})?)\s*\]/gi;
  
  while ((match = addFundsPattern.exec(content)) !== null) {
    const goalName = match[1].trim();
    const amount = parseFloat(match[2].replace(/,/g, ''));
    
    if (goalName && !isNaN(amount) && amount > 0) {
      actions.push({
        type: 'add_funds_to_goal',
        data: { goalName, amount },
        displayLabel: `Add $${amount.toLocaleString()} to ${goalName}`,
      });
    }
  }
  
  return actions;
};

// Remove all action markers from content for display
const cleanAllActionMarkers = (content: string): string => {
  return content
    .replace(/\[CREATE_GOAL:\s*[^\]]+\]/gi, '')
    .replace(/\[CREATE_EXPENSE:\s*[^\]]+\]/gi, '')
    .replace(/\[CREATE_INCOME:\s*[^\]]+\]/gi, '')
    .replace(/\[EDIT_GOAL:\s*[^\]]+\]/gi, '')
    .replace(/\[EDIT_EXPENSE:\s*[^\]]+\]/gi, '')
    .replace(/\[EDIT_INCOME:\s*[^\]]+\]/gi, '')
    .replace(/\[CREATE_BUDGET:\s*[^\]]+\]/gi, '')
    .replace(/\[EDIT_BUDGET:\s*[^\]]+\]/gi, '')
    .replace(/\[DELETE_BUDGET:\s*[^\]]+\]/gi, '')
    .replace(/\[LINK_GOAL_TO_BUDGET:\s*[^\]]+\]/gi, '')
    .replace(/\[ADD_FUNDS_TO_GOAL:\s*[^\]]+\]/gi, '')
    .replace(/\[GOAL:\s*[^\]]+\]/gi, '') // Legacy format
    .trim();
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

const getActionIcon = (type: ActionType) => {
  switch (type) {
    case 'create_goal':
      return Target;
    case 'create_expense':
      return MinusCircle;
    case 'create_income':
      return PlusCircle;
    case 'edit_goal':
    case 'edit_expense':
    case 'edit_income':
    case 'edit_budget':
      return Pencil;
    case 'create_budget':
      return Plus;
    case 'delete_budget':
      return Trash2;
    case 'link_goal_to_budget':
      return Target;
    case 'add_funds_to_goal':
      return DollarSign;
    default:
      return Plus;
  }
};

const getActionButtonStyle = (type: ActionType) => {
  switch (type) {
    case 'create_goal':
      return 'border-primary/50 hover:bg-primary/10 hover:border-primary text-primary';
    case 'create_expense':
      return 'border-destructive/50 hover:bg-destructive/10 hover:border-destructive text-destructive';
    case 'create_income':
      return 'border-success/50 hover:bg-success/10 hover:border-success text-success';
    case 'edit_goal':
    case 'edit_expense':
    case 'edit_income':
    case 'edit_budget':
      return 'border-secondary/50 hover:bg-secondary/10 hover:border-secondary text-secondary-foreground';
    case 'create_budget':
      return 'border-warning/50 hover:bg-warning/10 hover:border-warning text-warning';
    case 'delete_budget':
      return 'border-destructive/50 hover:bg-destructive/10 hover:border-destructive text-destructive';
    case 'link_goal_to_budget':
      return 'border-primary/50 hover:bg-primary/10 hover:border-primary text-primary';
    case 'add_funds_to_goal':
      return 'border-success/50 hover:bg-success/10 hover:border-success text-success';
    default:
      return 'border-primary/50 hover:bg-primary/10 hover:border-primary';
  }
};

const FinancialAdvisorChat: React.FC<FinancialAdvisorChatProps> = ({ 
  financialContext,
  standalone = false,
  onCreateGoal,
  onCreateExpense,
  onCreateIncome,
  onEditGoal,
  onEditExpense,
  onEditIncome,
  onCreateBudget,
  onEditBudget,
  onDeleteBudget,
  onLinkGoalToBudget,
  onAddFundsToGoal,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Load conversations on mount and check for inactivity
  useEffect(() => {
    const stored = loadStoredChats();
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    const now = Date.now();
    
    // Check if 30 minutes have passed since last activity
    if (lastActivity) {
      const timeSinceLastActivity = now - parseInt(lastActivity, 10);
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        // Clear conversation and start fresh
        setConversations(stored.conversations);
        setActiveConversationId(null);
        setMessages([]);
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        return;
      }
    }
    
    setConversations(stored.conversations);
    
    if (stored.activeConversationId) {
      const activeConvo = stored.conversations.find(c => c.id === stored.activeConversationId);
      if (activeConvo) {
        setActiveConversationId(activeConvo.id);
        setMessages(activeConvo.messages);
      }
    }
    
    // Update last activity timestamp
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }, []);

  // Update last activity on any user interaction with the chat
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Check for inactivity periodically
  useEffect(() => {
    const checkInactivity = () => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS && messages.length > 0) {
          // Auto-reset to new conversation
          setActiveConversationId(null);
          setMessages([]);
          localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
      }
    };

    // Check every minute
    const intervalId = setInterval(checkInactivity, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [messages.length]);

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

  // Rotating placeholder animation
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % quickPrompts.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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

  const handleAction = (action: SuggestedAction) => {
    const { type, data } = action;
    
    switch (type) {
      case 'create_goal':
        if (onCreateGoal && data.name && data.targetAmount) {
          onCreateGoal({
            name: data.name,
            targetAmount: data.targetAmount,
            description: data.description,
            targetDate: data.targetDate,
          });
        }
        break;
      case 'create_expense':
        if (onCreateExpense && data.description && data.amount && data.category && data.date) {
          onCreateExpense({
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date,
          });
        }
        break;
      case 'create_income':
        if (onCreateIncome && data.description && data.amount && data.category && data.date) {
          onCreateIncome({
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date,
          });
        }
        break;
      case 'edit_goal':
        if (onEditGoal && data.id) {
          onEditGoal(data.id, {
            name: data.name,
            currentAmount: data.currentAmount,
            targetAmount: data.targetAmount,
            targetDate: data.targetDate,
            description: data.description,
          });
        }
        break;
      case 'edit_expense':
        if (onEditExpense && data.id) {
          onEditExpense(data.id, {
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date,
          });
        }
        break;
      case 'edit_income':
        if (onEditIncome && data.id) {
          onEditIncome(data.id, {
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date,
          });
        }
        break;
      case 'create_budget':
        if (onCreateBudget && data.name && (data.expenseAllocation !== undefined || data.savingsAllocation !== undefined)) {
          onCreateBudget({
            name: data.name,
            expenseAllocation: data.expenseAllocation || 0,
            savingsAllocation: data.savingsAllocation || 0,
            linkedGoalName: data.linkedGoalName,
            description: data.description,
          });
        }
        break;
      case 'edit_budget':
        if (onEditBudget && data.id) {
          onEditBudget(data.id, {
            name: data.name,
            expenseAllocation: data.expenseAllocation,
            savingsAllocation: data.savingsAllocation,
            linkedGoalName: data.linkedGoalName,
            description: data.description,
          });
        }
        break;
      case 'delete_budget':
        if (onDeleteBudget && data.id && data.name) {
          onDeleteBudget(data.id, data.name);
        }
        break;
      case 'link_goal_to_budget':
        if (onLinkGoalToBudget && data.budgetName && data.goalName) {
          onLinkGoalToBudget(data.budgetName, data.goalName);
        }
        break;
      case 'add_funds_to_goal':
        if (onAddFundsToGoal && data.goalName && data.amount) {
          onAddFundsToGoal(data.goalName, data.amount);
        }
        break;
    }
  };

  const streamChat = async (userMessage: string) => {
    // Update activity timestamp on user interaction
    updateLastActivity();
    
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
    <Card className={cn(
      "flex flex-col h-full overflow-hidden backdrop-blur-[5px]",
      standalone ? "border-0 shadow-none bg-transparent" : "bg-card/60 border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
    )}>
      {/* Header - hidden in standalone mode since Sage page has its own header */}
      {!standalone && (
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between p-4 border-b border-border/50 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-muted to-primary flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Financial Advisor</h3>
              <p className="text-xs text-muted-foreground">Your AI financial coach</p>
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
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-background/50" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-6">
            {/* Welcome Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card/70 backdrop-blur-md border border-border/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card/70 backdrop-blur-md border border-border/40 rounded-xl rounded-bl-none px-4 py-3 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
                <p className="text-sm text-foreground">
                  Hi! I'm your financial advisor. Ask me about your spending, savings goals, or get personalized tips. I can also create or edit expenses, incomes, and goals for you!
                </p>
              </div>
            </motion.div>
            
            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((qp, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-3 text-xs font-medium rounded-lg bg-card/70 backdrop-blur-md border border-border/40 text-foreground hover:bg-card hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <qp.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-left">{qp.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const suggestedActions = msg.role === 'assistant' ? parseAllActions(msg.content) : [];
              const displayContent = msg.role === 'assistant' ? cleanAllActionMarkers(msg.content) : msg.content;
              const isStreaming = isLoading && i === messages.length - 1 && msg.role === 'assistant';
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <ChatMessageBubble 
                    message={msg} 
                    displayContent={displayContent}
                    isStreaming={isStreaming}
                  />
                  
                  {/* Action Buttons */}
                  {suggestedActions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap gap-2 mt-2 ml-11 max-w-[75%]"
                    >
                      {suggestedActions.map((action, actionIndex) => {
                        const Icon = getActionIcon(action.type);
                        const buttonStyle = getActionButtonStyle(action.type);
                        
                        return (
                          <motion.div
                            key={actionIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: actionIndex * 0.05 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "gap-1.5 text-xs h-8 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                                buttonStyle
                              )}
                              onClick={() => handleAction(action)}
                            >
                              <Icon className="h-3 w-3" />
                              {action.displayLabel}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            })}
            
            {/* Typing Indicator while loading */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card/70 backdrop-blur-md border border-border/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card/70 backdrop-blur-md border border-border/40 rounded-xl rounded-bl-none px-4 py-3">
                  <ChatTypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-border/50 bg-card/80 backdrop-blur-md">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full pr-4 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300"
              disabled={isLoading}
            />
            <AnimatePresence mode="wait">
              {!input && (
                <motion.p
                  key={currentPlaceholder}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none"
                >
                  {quickPrompts[currentPlaceholder].label}...
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !input.trim()}
              className={cn(
                "bg-gradient-to-r from-muted to-primary text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_hsl(var(--primary)/0.3)]",
                input.trim() && !isLoading && "hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        </div>
      </form>
    </Card>
  );
};

export default FinancialAdvisorChat;
