import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Moon, Sun, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

interface ProfileDialogProps {
  userName: string;
}

export default function ProfileDialog({ userName }: ProfileDialogProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const handleSettings = () => {
    navigate('/account');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 hover:bg-accent/50 transition-colors px-3 py-2"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold">{userName}</span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-popover border-border shadow-lg z-50"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSettings}
          className="cursor-pointer"
        >
          <Settings size={16} className="mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {theme === 'light' ? (
                <Sun size={16} className="mr-2" />
              ) : (
                <Moon size={16} className="mr-2" />
              )}
              <span>Dark Mode</span>
            </div>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={toggleTheme}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut size={16} className="mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
