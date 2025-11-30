import { categoryLabels, categoryIcons } from "@/lib/mockData";
import { useCategories } from "@/hooks/useCategories";

interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md" | "lg";
}

export default function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const { getAllCategories } = useCategories();
  const allCategories = getAllCategories();
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
      savings: "bg-success/10 text-success border-success/20",
      fun: "bg-warning/10 text-warning border-warning/20",
    };
    return colorMap[cat as keyof typeof colorMap] || "bg-primary/10 text-primary border-primary/20";
  };

  const getDisplayName = (cat: string) => {
    // Check custom categories first
    const customCategory = allCategories.find(c => c.value === cat && c.isCustom);
    if (customCategory) return customCategory.label;
    
    // Then check built-in labels
    return categoryLabels[cat as keyof typeof categoryLabels] || 
           cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getIcon = (cat: string) => {
    return categoryIcons[cat as keyof typeof categoryIcons] || "📂";
  };

  return (
    <span className={`category-badge border ${sizes[size]} ${getColorClasses(category)}`}>
      <span className="mr-1">{getIcon(category)}</span>
      {getDisplayName(category)}
    </span>
  );
}