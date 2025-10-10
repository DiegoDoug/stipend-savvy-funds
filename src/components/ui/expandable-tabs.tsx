"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  expanded?: boolean;
  selectedTab?: number | null;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  expanded = false,
  selectedTab = null,
  onChange,
}: ExpandableTabsProps) {
  const outsideClickRef = React.useRef(null);

  useOnClickOutside(outsideClickRef, () => {
    onChange?.(null);
  });

  const Separator = () => (
    <div className="my-1 w-[24px] h-[1.2px] bg-border" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border bg-background p-1 shadow-sm w-full",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if ("type" in tab && tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selectedTab === index;

        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => onChange?.(index)}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl px-2 py-3 text-sm font-medium transition-all duration-300 w-full",
              isSelected
                ? cn("bg-muted", activeColor, "shadow-lg")
                : "text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-lg"
            )}
            style={{
              minWidth: expanded ? "8rem" : "2.5rem",
              maxWidth: expanded ? "12rem" : "3rem",
              justifyContent: expanded ? "flex-start" : "center",
            }}
          >
            <Icon size={24} />
            <AnimatePresence initial={false}>
              {expanded && isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden ml-4 text-xs"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}