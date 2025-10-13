import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Shield, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
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

function FloatingIcon({ icon: Icon, delay = 0, className = "" }: { icon: any; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 1,
        delay,
        ease: "easeOut",
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] p-4 shadow-xl">
          <Icon className="h-8 w-8 text-teal-300/80" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/20 to-transparent blur-xl" />
      </motion.div>
    </motion.div>
  );
}

function PasswordResetDialog({
  isOpen,
  onClose,
  email,
  supabaseClient,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  supabaseClient: any;
}) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (confirmEmail !== email) {
      toast({
        title: "Email mismatch",
        description: "The confirmation email doesn't match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Send the reset email - Supabase handles checking if email exists
      const { error } = await supabaseClient.auth.resetPasswordForEmail(confirmEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "If an account exists with this email, we've sent you a password reset link",
        });
        onClose();
        setConfirmEmail("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md"
            >
              <Card className="p-6 space-y-4 bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-2xl">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                  <p className="text-sm text-white/60">Confirm your email address to receive a password reset link</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-email" className="text-white/80">
                      Confirm Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <Input
                        id="confirm-email"
                        type="email"
                        placeholder={email}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleResetPassword();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleResetPassword}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium shadow-lg shadow-teal-500/20"
                      disabled={loading || !confirmEmail}
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !password || (!isLogin && !name)) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      const { error } = isLogin ? await signIn(email, password) : await signUp(email, password, name);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (!isLogin) {
          toast({
            title: "Success",
            description: "Account created! Please check your email to verify your account.",
          });
          setIsLogin(true);
          setPassword("");
        } else {
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }
    setShowResetDialog(true);
  };

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

        <FloatingShape
          delay={0.5}
          width={300}
          height={80}
          rotate={25}
          gradient="from-teal-400/[0.12]"
          className="right-[20%] top-[5%]"
        />

        <FloatingShape
          delay={0.6}
          width={250}
          height={70}
          rotate={-18}
          gradient="from-navy-400/[0.1]"
          className="left-[30%] top-[8%]"
        />

        <FloatingShape
          delay={0.7}
          width={200}
          height={60}
          rotate={22}
          gradient="from-cyan-400/[0.08]"
          className="right-[15%] bottom-[20%]"
        />
      </div>

      {/* Floating financial icons */}
      {mounted && (
        <>
          <FloatingIcon
            icon={Shield}
            delay={0.8}
            className="left-[10%] top-[20%] hidden md:block pointer-events-none"
          />
          <FloatingIcon
            icon={TrendingUp}
            delay={1}
            className="right-[12%] top-[25%] hidden md:block pointer-events-none"
          />
          <FloatingIcon
            icon={Lock}
            delay={0.9}
            className="left-[15%] bottom-[25%] hidden md:block pointer-events-none"
          />
          <FloatingIcon
            icon={DollarSign}
            delay={1.1}
            className="right-[18%] bottom-[30%] hidden md:block pointer-events-none"
          />
        </>
      )}

      {/* Radial gradient overlays for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-teal-500/[0.08] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-navy-500/[0.1] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Subtle animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-teal-300/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80 pointer-events-none" />

      {/* Password Reset Dialog */}
      <PasswordResetDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        email={email}
        supabaseClient={supabase}
      />

      {/* Auth Card - Centered Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Card className="w-full p-8 space-y-6 bg-slate-900/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <div className="text-center">
              <motion.img
                src="/Icon.png"
                alt="FinTrack Logo"
                className="w-16 h-16 mx-auto mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
              />
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                FinTrack
              </h1>
              <p className="text-white/50 mt-2 text-sm">
                {isLogin ? "Your expense and income tracker" : "Create your account"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/80">
                    Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-teal-500/50"
                    required
                  />
                </div>
                <div>
                  {!isLogin && (
                    <div className="bg-white/4 border border-white/12 rounded-lg p-4 backdrop-blur-sm mt-1">
                      <div className="space-y-1 text-sm text-white/60 mt-2">
                        {[
                          { label: "At least 10 characters", test: password.length >= 10 },
                          { label: "Contains lowercase letter", test: /[a-z]/.test(password) },
                          { label: "Contains uppercase letter", test: /[A-Z]/.test(password) },
                          { label: "Contains number", test: /\d/.test(password) },
                          { label: "Contains symbol", test: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                        ].map((req, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            {req.test ? (
                              <CheckCircle2 className="h-4 w-4 text-teal-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-white/20" />
                            )}
                            <span className={req.test ? "text-teal-400" : "text-white/40"}>{req.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium shadow-lg shadow-teal-500/20"
                disabled={loading}
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            {isLogin && (
              <div className="text-center -mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-white/50 hover:text-teal-400 transition-colors"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-white/50">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
