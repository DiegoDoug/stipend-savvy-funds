import { categoryLabels, categoryIcons } from "@/lib/mockData";

interface CategoryBadgeProps {
  category: keyof typeof categoryLabels;
  size?: "sm" | "md" | "lg";
}

export default function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1", 
    lg: "text-base px-4 py-2"
  };

  const getColorClasses = (cat: string) => {
    const colorMap = {
      essentials: "bg-category-essentials/10 text-category-essentials border-category-essentials/20",
      athletic: "bg-category-athletic/10 text-category-athletic border-category-athletic/20",
      education: "bg-category-education/10 text-category-education border-category-education/20",
      personal: "bg-category-personal/10 text-category-personal border-category-personal/20",
      extra: "bg-category-extra/10 text-category-extra border-category-extra/20",
      refund: "bg-category-refund/10 text-category-refund border-category-refund/20",
    };
    return colorMap[cat as keyof typeof colorMap] || "bg-muted text-muted-foreground";
  };

  return (
    <span className={`category-badge border ${sizes[size]} ${getColorClasses(category)}`}>
      <span className="mr-1">{categoryIcons[category]}</span>
      {categoryLabels[category]}
    </span>
  );
}