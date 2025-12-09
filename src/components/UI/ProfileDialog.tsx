import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Moon, Sun, ChevronDown, Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";

interface ProfileDialogProps {
  userName: string;
}

export default function ProfileDialog({ userName }: ProfileDialogProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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
            <p className="text-xs text-muted-foreground">{t('common.manageAccount')}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSettings}
          className="cursor-pointer"
        >
          <Settings size={16} className="mr-2" />
          {t('common.settings')}
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
              <span>{t('common.darkMode')}</span>
            </div>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={toggleTheme}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Globe size={16} className="mr-2" />
            {t('common.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="bg-popover border-border">
              <DropdownMenuItem 
                onClick={() => setLanguage('en')}
                className="cursor-pointer"
              >
                <span className="mr-2">🇺🇸</span>
                {t('common.english')}
                {language === 'en' && <Check size={16} className="ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('es')}
                className="cursor-pointer"
              >
                <span className="mr-2">🇪🇸</span>
                {t('common.spanish')}
                {language === 'es' && <Check size={16} className="ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut size={16} className="mr-2" />
          {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
