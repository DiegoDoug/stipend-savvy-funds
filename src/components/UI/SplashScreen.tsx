import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import sagetrackLogo from "@/assets/sagetrack-logo-new.png";

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={onComplete}
    >
      {/* Theme Toggle - Top Right */}
      <motion.button
        onClick={toggleTheme}
        className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-foreground hover:bg-card transition-colors shadow-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getThemeIcon()}
        <span className="text-xs font-medium">{getThemeLabel()}</span>
      </motion.button>

      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Logo container */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.img
          src={sagetrackLogo}
          alt="SageTrack"
          className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />

        {/* Loading indicator */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary"
                animate={{
                  y: [-4, 4, -4],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-muted-foreground text-sm md:text-base font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Your Finances, Finally in Focus
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
