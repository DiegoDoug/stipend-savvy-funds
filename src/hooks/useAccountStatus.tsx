import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function useAccountStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setStatus(data.status || 'active');
        }
      } catch (error) {
        console.error('Error fetching account status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [user]);

  const isActive = status === 'active';

  const checkAndNotify = () => {
    if (!isActive) {
      toast({
        title: "Account Deactivated",
        description: "Please reactivate your account in Account Settings to make changes.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  return { isActive, status, loading, checkAndNotify };
}
