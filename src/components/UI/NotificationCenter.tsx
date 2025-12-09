import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Target, Calendar, Wallet, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { generateNotifications } from '@/lib/notificationGenerator';
import { useAuth } from '@/hooks/useAuth';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const typeIcons: Record<string, React.ElementType> = {
  subscription_reminder: Bell,
  budget_warning: AlertTriangle,
  goal_milestone: Target,
  goal_achieved: Sparkles,
  recurring_expense: Calendar,
  system: Bell,
};

const priorityColors: Record<string, string> = {
  urgent: 'border-l-destructive bg-destructive/5',
  high: 'border-l-warning bg-warning/5',
  normal: 'border-l-primary bg-primary/5',
  low: 'border-l-muted-foreground bg-muted/5',
};

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch,
  } = useNotifications();

  // Generate notifications on mount and periodically
  useEffect(() => {
    if (!user) return;

    const generate = async () => {
      setGenerating(true);
      await generateNotifications(user.id);
      await refetch();
      setGenerating(false);
    };

    generate();

    // Refresh every 5 minutes
    const interval = setInterval(generate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, refetch]);

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.link_path) {
      navigate(notification.link_path);
      setOpen(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await dismissNotification(notificationId);
  };

  const getIcon = (type: string) => {
    const Icon = typeIcons[type] || Bell;
    return Icon;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1.5 sm:p-2 rounded-lg hover:bg-accent/50 transition-colors relative">
          <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-medium",
              "bg-destructive text-destructive-foreground",
              generating && "animate-pulse"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {unreadCount === 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted-foreground/30 rounded-full" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 p-0 bg-card border-border shadow-xl" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">({unreadCount} unread)</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 px-2"
            >
              <Check size={14} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell size={32} className="text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/30 border-l-4",
                      priorityColors[notification.priority] || priorityColors.normal,
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      notification.priority === 'urgent' ? "bg-destructive/20 text-destructive" :
                      notification.priority === 'high' ? "bg-warning/20 text-warning" :
                      "bg-primary/20 text-primary"
                    )}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm leading-tight",
                        !notification.is_read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link_label && (
                          <span className="text-[10px] text-primary font-medium">
                            {notification.link_label} →
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => handleDismiss(e, notification.id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate('/subscriptions');
                setOpen(false);
              }}
              className="w-full text-xs h-8"
            >
              Manage Subscriptions & Reminders
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
