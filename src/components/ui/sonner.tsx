import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:bg-success/10 group-[.toaster]:border-success/30 group-[.toaster]:text-success",
          error: "group-[.toaster]:bg-destructive/10 group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive",
          warning: "group-[.toaster]:bg-warning/10 group-[.toaster]:border-warning/30 group-[.toaster]:text-warning",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
