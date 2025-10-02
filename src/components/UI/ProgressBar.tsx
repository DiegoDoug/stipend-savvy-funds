interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export default function ProgressBar({ 
  value, 
  max, 
  color = "primary", 
  size = "md",
  showLabel = false,
  label
}: ProgressBarProps) {
  // If max is 0 or negative, percentage should be 0
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const heights = {
    sm: "h-1",
    md: "h-2", 
    lg: "h-3"
  };

  const getColorClass = () => {
    if (percentage > 90) return "bg-gradient-to-r from-danger to-warning";
    if (percentage > 75) return "bg-gradient-to-r from-warning to-secondary";
    return `bg-gradient-to-r from-${color} to-${color}-glow`;
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">
            ${value.toFixed(0)} / ${max.toFixed(0)}
          </span>
        </div>
      )}
      <div className={`progress-bar ${heights[size]}`}>
        <div 
          className={`progress-fill ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-right mt-1">
          <span className="text-xs text-muted-foreground">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}