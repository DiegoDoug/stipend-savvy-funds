import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatTypingIndicator from './ChatTypingIndicator';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface ChatMessageBubbleProps {
  message: Message;
  displayContent: string;
  isStreaming?: boolean;
}

const ChatMessageBubble = ({ message, displayContent, isStreaming }: ChatMessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-r from-muted to-primary"
            : "bg-card/70 backdrop-blur-md border border-border/40"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
          isUser
            ? "bg-gradient-to-r from-muted to-primary text-primary-foreground rounded-br-none shadow-[0_4px_12px_hsl(var(--primary)/0.15)]"
            : "bg-card/70 backdrop-blur-md border border-border/40 text-foreground rounded-bl-none shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
        )}
      >
        {!displayContent && isStreaming ? (
          <ChatTypingIndicator />
        ) : (
          displayContent
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessageBubble;
