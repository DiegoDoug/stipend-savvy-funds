import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logError } from '@/lib/errorLogger';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_path: string | null;
  link_label: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  priority: string;
  created_at: string;
  expires_at: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error) {
      logError(error, 'useNotifications:fetchNotifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      logError(error, 'useNotifications:markAsRead');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      logError(error, 'useNotifications:markAllAsRead');
    }
  };

  const dismissNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      logError(error, 'useNotifications:dismissNotification');
    }
  };

  const dismissAll = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications([]);
    } catch (error) {
      logError(error, 'useNotifications:dismissAll');
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'is_dismissed' | 'created_at'>) => {
    if (!user) return;

    try {
      // Check for duplicate (same reference_id and type on same day)
      if (notification.reference_id) {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('reference_id', notification.reference_id)
          .eq('type', notification.type)
          .gte('created_at', today)
          .single();

        if (existing) return; // Don't create duplicate
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          ...notification,
        });

      if (error) throw error;
    } catch (error) {
      logError(error, 'useNotifications:createNotification');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const urgentNotifications = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');

  return {
    notifications,
    loading,
    unreadCount,
    urgentNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
    createNotification,
    refetch: fetchNotifications,
  };
}
