import { ReactNode } from "react";
import { GlowCard } from "@/components/ui/spotlight-card";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  subtitle?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  subtitle,
  glowColor = "blue"
}: StatCardProps) {
  const changeColors = {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted-foreground"
  };
  
  return (
    <GlowCard 
      glowColor={glowColor} 
      customSize={true}
      className="stat-card rounded w-full h-auto"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {change && <p className={`text-sm mt-2 font-medium ${changeColors[changeType]}`}>
              {change}
            </p>}
        </div>
        {icon && <div className="text-primary/70 ml-2">
            {icon}
          </div>}
      </div>
    </GlowCard>
  );
}