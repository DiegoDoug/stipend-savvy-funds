import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

function FloatingShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-teal-500/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate: rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent 70%)]",
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-teal-300/30"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);

    // Check for recovery session
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setHasRecoveryToken(true);
      } else {
        toast({
          title: "Invalid or expired link",
          description: "This password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/auth"), 2000);
      }
    };

    checkRecoverySession();

    // Listen for password recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasRecoveryToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const getPasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    };
    return checks;
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasRecoveryToken) {
      toast({
        title: "Invalid session",
        description: "Please request a new password reset link.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    // Validate password
    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid password",
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been successfully updated. Redirecting to login...",
        });
        setTimeout(() => navigate("/auth"), 2000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !hasRecoveryToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950">
      {/* Base gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.03] via-transparent to-navy-500/[0.05] blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/[0.02] via-transparent to-teal-500/[0.03]" />

      {/* Grid pattern */}
      <GridPattern />

      {/* Animated geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingShape
          delay={0.2}
          width={700}
          height={160}
          rotate={15}
          gradient="from-teal-500/[0.12]"
          className="left-[-15%] top-[10%]"
        />
        <FloatingShape
          delay={0.4}
          width={600}
          height={140}
          rotate={-12}
          gradient="from-navy-500/[0.15]"
          className="right-[-10%] top-[60%]"
        />
        <FloatingShape
          delay={0.3}
          width={400}
          height={100}
          rotate={-20}
          gradient="from-cyan-500/[0.1]"
          className="left-[5%] bottom-[15%]"
        />
      </div>

      {/* Radial gradient overlays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-teal-500/[0.08] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />

      {/* Reset Password Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Card className="w-full p-8 space-y-6 bg-slate-900/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <div className="text-center space-y-2">
              <motion.img
                src="/Icon.png"
                alt="SageTrack Logo"
                className="w-16 h-16 mx-auto mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
              />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                Reset Password
              </h1>
              <p className="text-white/60 text-sm">Enter your new password below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password strength indicators */}
                {password && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      {passwordStrength.length ? (
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      ) : (
                        <Circle className="h-3 w-3 text-white/30" />
                      )}
                      <span className={passwordStrength.length ? "text-teal-400" : "text-white/50"}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordStrength.uppercase ? (
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      ) : (
                        <Circle className="h-3 w-3 text-white/30" />
                      )}
                      <span className={passwordStrength.uppercase ? "text-teal-400" : "text-white/50"}>
                        One uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordStrength.lowercase ? (
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      ) : (
                        <Circle className="h-3 w-3 text-white/30" />
                      )}
                      <span className={passwordStrength.lowercase ? "text-teal-400" : "text-white/50"}>
                        One lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordStrength.number ? (
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      ) : (
                        <Circle className="h-3 w-3 text-white/30" />
                      )}
                      <span className={passwordStrength.number ? "text-teal-400" : "text-white/50"}>
                        One number
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/80">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-white/40 hover:text-white/60"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium shadow-lg shadow-teal-500/20"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-sm text-white/60 hover:text-white/80 transition-colors"
                >
                  Back to login
                </button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
