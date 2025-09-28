import { Plus } from "lucide-react";
import { useState } from "react";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface QuickActionFABProps {
  actions: QuickAction[];
}

export default function QuickActionFAB({ actions }: QuickActionFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-6 md:bottom-6 z-40">
      {/* Action buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="bg-card px-3 py-1 rounded-lg shadow-md text-sm font-medium border border-border/50">
                {action.label}
              </span>
              <button
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className="w-12 h-12 bg-card border border-border/50 rounded-full shadow-lg flex items-center justify-center text-foreground hover:bg-accent/50 transition-all duration-200 hover:scale-105"
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`floating-action ${isOpen ? 'rotate-45' : ''}`}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}