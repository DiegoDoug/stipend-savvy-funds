import { SidebarDock } from "@/components/ui/SidebarDock";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className="fixed left-0 top-0 h-full flex items-center bg-card z-50 shadow-lg">
        <SidebarDock onClose={onClose} />
      </aside>
    </>
  );
}
