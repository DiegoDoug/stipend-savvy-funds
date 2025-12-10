import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Shield, TrendingUp, PiggyBank, Receipt, Sparkles, Bell,
  ChartLine, Target, Wallet, ArrowRight, Star, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FloatingShape = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={`absolute rounded-full opacity-20 blur-3xl ${className}`}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, 0],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  />
);

const FloatingIcon = ({ icon: Icon, className, delay = 0 }: { icon: any; className: string; delay?: number }) => (
  <motion.div
    className={`absolute ${className}`}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 10, -10, 0],
    }}
    transition={{
      duration: 6,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  >
    <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg">
      <Icon className="w-6 h-6 text-primary" />
    </div>
  </motion.div>
);

const features = [
  {
    icon: Wallet,
    title: "Smart Budget Tracking",
    description: "Create custom budgets and track spending across categories in real-time."
  },
  {
    icon: Target,
    title: "Savings Goals",
    description: "Set financial milestones and watch your progress with visual charts."
  },
  {
    icon: Receipt,
    title: "AI Receipt Scanner",
    description: "Snap a photo and let AI extract expense details automatically."
  },
  {
    icon: Sparkles,
    title: "Sage AI Advisor",
    description: "Get personalized insights and recommendations from your AI financial companion."
  },
  {
    icon: ChartLine,
    title: "Financial Forecasting",
    description: "Predict future cash flow and plan ahead with confidence."
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Stay on top of subscriptions, bills, and budget alerts."
  }
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "College Student",
    quote: "FinTrack helped me save $500 in my first semester. The AI advisor is like having a financial mentor!",
    avatar: "S"
  },
  {
    name: "Marcus J.",
    role: "Young Professional",
    quote: "Finally, a finance app that doesn't make me feel overwhelmed. Simple, beautiful, and actually useful.",
    avatar: "M"
  },
  {
    name: "Emily R.",
    role: "Freelancer",
    quote: "The receipt scanner alone saves me hours every month. Sage's insights are surprisingly accurate.",
    avatar: "E"
  }
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <FloatingShape className="w-96 h-96 bg-primary -top-48 -left-48" delay={0} />
        <FloatingShape className="w-80 h-80 bg-secondary top-1/4 -right-40" delay={2} />
        <FloatingShape className="w-64 h-64 bg-primary/50 bottom-1/4 left-1/4" delay={4} />
        <FloatingShape className="w-72 h-72 bg-accent/30 -bottom-36 right-1/3" delay={1} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/fintrack-icon.png" alt="FinTrack" className="w-10 h-10" />
            <span className="text-2xl font-bold text-white font-display">FinTrack</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <FloatingIcon icon={Shield} className="top-0 left-[10%] hidden md:block" delay={0} />
          <FloatingIcon icon={TrendingUp} className="top-20 right-[15%] hidden md:block" delay={1.5} />
          <FloatingIcon icon={PiggyBank} className="bottom-0 left-[20%] hidden md:block" delay={3} />
          
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                AI-Powered Financial Management
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Your Finances,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-glow to-secondary">
                Finally in Focus
              </span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              FinTrack is your personal finance companion, built to make money management feel effortless. 
              Track budgets, set savings goals, scan receipts with AI, and get personalized advice from 
              Sage—your built-in financial advisor.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg shadow-xl shadow-primary/30 group">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg">
                  Learn More
                </Button>
              </a>
            </motion.div>

            <motion.div
              className="mt-12 flex items-center justify-center gap-8 text-white/60 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Bank-level security</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-24 bg-gradient-to-b from-transparent to-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
              Everything You Need to{" "}
              <span className="text-primary">Master Your Money</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Powerful features designed to give you complete visibility and control over your financial life.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Showcase Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-slate-800/50 to-secondary/10 border border-white/10 p-8 md:p-12 overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(45,212,191,0.15),transparent_50%)]" />
            
            <div className="relative grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-display">
                  See Your Finances Like Never Before
                </h2>
                <p className="text-white/70 mb-8 text-lg">
                  Our intuitive dashboard gives you a complete picture of your money at a glance. 
                  Track income, expenses, and savings goals all in one beautiful interface.
                </p>
                <ul className="space-y-4">
                  {[
                    "Real-time balance and spending updates",
                    "Visual budget progress tracking",
                    "AI-powered insights and recommendations",
                    "Predictive financial forecasting"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/80">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <ChartLine className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-white/60">Dashboard Preview</p>
                    <p className="text-white/40 text-sm mt-2">Interactive demo coming soon</p>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-primary/20 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-secondary/20 blur-2xl" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 px-6 py-24 bg-gradient-to-b from-transparent to-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
              Loved by Users{" "}
              <span className="text-secondary">Everywhere</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Join thousands of people who have transformed their financial habits with FinTrack.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-white/80 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-white/50 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="relative rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 border border-primary/20 p-12 text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(45,212,191,0.1),transparent_70%)]" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
                Ready to Take Control of Your Finances?
              </h2>
              <p className="text-white/70 mb-8 max-w-xl mx-auto">
                Join FinTrack today and start your journey to financial clarity. 
                It's free to get started—no credit card required.
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg shadow-xl shadow-primary/30 group">
                  Start Your Free Account
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/images/fintrack-icon.png" alt="FinTrack" className="w-8 h-8" />
              <span className="text-xl font-bold text-white font-display">FinTrack</span>
            </div>
            
            <div className="flex items-center gap-8 text-white/60 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
            
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} FinTrack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
