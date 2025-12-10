import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileDialog from "@/components/UI/ProfileDialog";
import { SearchBar } from "@/components/ui/search-bar";
import { NotificationCenter } from "@/components/UI/NotificationCenter";

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
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              SageTrack
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Student Finance Manager</p>
          </div>
        </div>

        <div className="flex-1 max-w-md hidden md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationCenter />
          {userName && <ProfileDialog userName={userName} />}
        </div>
      </div>
    </header>
  );
}
