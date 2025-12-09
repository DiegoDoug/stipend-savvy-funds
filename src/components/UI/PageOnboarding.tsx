import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_PREFIX = 'fintrack-onboarding-';
const SAGE_ONBOARDING_KEY = 'sage-onboarding-completed';

export interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: string;
  bgColor?: string;
  highlightSelector?: string; // CSS selector for element to highlight
}

export interface PageOnboardingConfig {
  pageKey: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconGradient?: string;
  steps: OnboardingStep[];
  tips?: string[];
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PageOnboardingProps {
  config: PageOnboardingConfig;
  onComplete: () => void;
}

export function PageOnboarding({ config, onComplete }: PageOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const totalSteps = config.steps.length;

  // Update highlight position when step changes and scroll element into view
  useEffect(() => {
    const step = config.steps[currentStep];
    if (step?.highlightSelector) {
      const element = document.querySelector(step.highlightSelector);
      if (element) {
        // Scroll element into view first
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Wait for scroll to complete before calculating position
        const updateRect = () => {
          const rect = element.getBoundingClientRect();
          const padding = 8;
          setHighlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
        };
        
        // Update position after scroll animation
        const scrollTimeout = setTimeout(updateRect, 400);
        return () => clearTimeout(scrollTimeout);
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, config.steps]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(`${ONBOARDING_PREFIX}${config.pageKey}`, 'true');
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(`${ONBOARDING_PREFIX}${config.pageKey}`, 'true');
    setTimeout(onComplete, 300);
  };

  const IconComponent = config.icon;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Spotlight overlay with cutout for highlighted element */}
      {highlightRect ? (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top overlay */}
          <div 
            className="absolute left-0 right-0 top-0 bg-background/90 backdrop-blur-sm"
            style={{ height: highlightRect.top }}
          />
          {/* Bottom overlay */}
          <div 
            className="absolute left-0 right-0 bottom-0 bg-background/90 backdrop-blur-sm"
            style={{ top: highlightRect.top + highlightRect.height }}
          />
          {/* Left overlay */}
          <div 
            className="absolute left-0 bg-background/90 backdrop-blur-sm"
            style={{ 
              top: highlightRect.top, 
              width: highlightRect.left, 
              height: highlightRect.height 
            }}
          />
          {/* Right overlay */}
          <div 
            className="absolute right-0 bg-background/90 backdrop-blur-sm"
            style={{ 
              top: highlightRect.top, 
              left: highlightRect.left + highlightRect.width, 
              height: highlightRect.height 
            }}
          />
          {/* Highlight border */}
          <div 
            className="absolute rounded-lg border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] animate-pulse"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      )}
      <Card className={cn(
        "relative z-10 w-full max-w-md overflow-hidden border-border/50 shadow-2xl transition-all duration-500 bg-card",
        isVisible ? "animate-scale-in" : "animate-scale-out"
      )}>
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary-glow/30 rounded-full blur-xl animate-pulse" />
            <div className={cn(
              "relative p-3 rounded-xl shadow-lg",
              config.iconGradient || "bg-gradient-to-br from-primary to-primary-glow"
            )}>
              <IconComponent className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-bold">{config.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {config.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === currentStep 
                  ? "w-5 bg-primary" 
                  : i < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted hover:bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="px-6 pb-4 min-h-[200px]">
          <div key={currentStep} className="animate-fade-in">
            {config.steps[currentStep] && (() => {
              const step = config.steps[currentStep];
              const StepIcon = step.icon;
              return (
                <div className="text-center">
                  <div className={cn(
                    "inline-flex p-3 rounded-xl mb-4",
                    step.bgColor || "bg-primary/10"
                  )}>
                    <StepIcon className={cn("h-6 w-6", step.color || "text-primary")} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Tips Section (on last step) */}
          {currentStep === totalSteps - 1 && config.tips && config.tips.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 animate-fade-in">
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Tips:</p>
              <ul className="space-y-1">
                {config.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {currentStep === totalSteps - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function usePageOnboarding(pageKey: string) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`${ONBOARDING_PREFIX}${pageKey}`);
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 300);
      return () => clearTimeout(timer);
    }
  }, [pageKey]);

  const completeOnboarding = () => setShowOnboarding(false);

  return { showOnboarding, completeOnboarding };
}

// Reset all onboarding (useful for testing or settings)
export function resetAllOnboarding() {
  const keys = Object.keys(localStorage).filter(key => key.startsWith(ONBOARDING_PREFIX));
  keys.forEach(key => localStorage.removeItem(key));
  // Also reset Sage onboarding
  localStorage.removeItem(SAGE_ONBOARDING_KEY);
}

export default PageOnboarding;
