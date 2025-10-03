import { useState, useEffect } from "react";
import { Menu, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserName(data.name || user.email?.split('@')[0] || 'User');
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <header className="bg-card border-b border-border/50 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-accent/50 transition-colors md:hidden">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              FinTrack
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Student Finance Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-accent/50 transition-colors relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full text-xs"></span>
          </button>
          
          {userName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
              <User size={16} className="text-primary" />
              <span className="text-sm font-medium">{userName}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}