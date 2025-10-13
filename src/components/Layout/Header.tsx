import { useState, useEffect } from "react";
import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileDialog from "@/components/UI/ProfileDialog";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();

      if (data) {
        setUserName(data.name || user.email?.split("@")[0] || "User");
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <header className="bg-card border-b border-border/50 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              FinTrack
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Student Finance Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="p-1.5 sm:p-2 rounded-lg hover:bg-accent/50 transition-colors relative">
            <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-warning rounded-full text-xs"></span>
          </button>

          {userName && <ProfileDialog userName={userName} />}
        </div>
      </div>
    </header>
  );
}
