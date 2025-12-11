import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Moon, Sun, Monitor, ChevronDown, Globe, Check } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";

interface ProfileDialogProps {
  userName: string;
}

export default function ProfileDialog({ userName }: ProfileDialogProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor size={16} className="mr-2" />;
    if (theme === 'dark') return <Moon size={16} className="mr-2" />;
    return <Sun size={16} className="mr-2" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return t('common.systemTheme') || 'System';
    if (theme === 'dark') return t('common.darkMode');
    return t('common.lightMode') || 'Light';
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

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {getThemeIcon()}
            <span>{t('common.theme') || 'Theme'}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="bg-popover border-border">
              <DropdownMenuItem 
                onClick={() => setTheme('light')}
                className="cursor-pointer"
              >
                <Sun size={16} className="mr-2" />
                {t('common.lightMode') || 'Light'}
                {theme === 'light' && <Check size={16} className="ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('dark')}
                className="cursor-pointer"
              >
                <Moon size={16} className="mr-2" />
                {t('common.darkMode')}
                {theme === 'dark' && <Check size={16} className="ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('system')}
                className="cursor-pointer"
              >
                <Monitor size={16} className="mr-2" />
                {t('common.systemTheme') || 'System'}
                {theme === 'system' && <Check size={16} className="ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

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
