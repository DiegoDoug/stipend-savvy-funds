import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  TrendingUp, 
  PiggyBank, 
  Target, 
  Wallet, 
  ArrowRight,
  MessageSquare,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SAGE_ONBOARDING_KEY = 'sage-onboarding-completed';

interface SageWelcomeProps {
  onComplete: () => void;
  onSkip: () => void;
}

const features = [
  {
    icon: TrendingUp,
    title: 'Analyze Spending',
    description: 'Get insights on where your money goes and identify savings opportunities.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Target,
    title: 'Smart Goals',
    description: 'Create personalized savings goals with AI-powered recommendations.',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    icon: Wallet,
    title: 'Budget Management',
    description: 'Let Sage create and optimize budgets based on your income.',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    icon: Zap,
    title: 'Direct Actions',
    description: 'Sage can create expenses, incomes, and goals directly from chat.',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

const samplePrompts = [
  "Analyze my spending patterns this month",
  "Help me create a vacation savings goal",
  "How can I reduce my monthly expenses?",
  "Create a budget based on my income",
];

export function SageWelcome({ onComplete, onSkip }: SageWelcomeProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(SAGE_ONBOARDING_KEY, 'true');
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(SAGE_ONBOARDING_KEY, 'true');
    setTimeout(onSkip, 300);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <Card className={cn(
        "w-full max-w-lg overflow-hidden border-border/50 shadow-2xl transition-all duration-500",
        isVisible ? "animate-scale-in" : "animate-scale-out"
      )}>
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === step 
                  ? "w-6 bg-primary" 
                  : i < step 
                    ? "bg-primary/50" 
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center text-center animate-fade-in">
              {/* Animated Logo */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary-glow/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Meet Sage</h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                Your personal AI financial advisor, ready to help you manage money smarter and reach your goals faster.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {[
                  { icon: MessageSquare, label: 'Smart Conversations' },
                  { icon: Shield, label: 'Secure & Private' },
                  { icon: Zap, label: 'Instant Actions' },
                  { icon: PiggyBank, label: 'Save More' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <h2 className="text-xl font-bold mb-2 text-center">What Sage Can Do</h2>
              <p className="text-muted-foreground text-center mb-6 text-sm">
                Powerful features to transform your finances
              </p>

              <div className="space-y-3 flex-1">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className={cn("p-2 rounded-lg shrink-0", feature.bgColor)}>
                      <feature.icon className={cn("h-4 w-4", feature.color)} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <h2 className="text-xl font-bold mb-2 text-center">Try These Prompts</h2>
              <p className="text-muted-foreground text-center mb-6 text-sm">
                Get started with these example questions
              </p>

              <div className="space-y-2 flex-1">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                    style={{ animationDelay: `${i * 100}ms` }}
                    onClick={handleComplete}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        "{prompt}"
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Or just type anything you'd like to ask!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
          >
            {step === 2 ? 'Get Started' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function useSageOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(SAGE_ONBOARDING_KEY);
    if (!completed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => setShowOnboarding(false);

  return { showOnboarding, completeOnboarding };
}

export default SageWelcome;
