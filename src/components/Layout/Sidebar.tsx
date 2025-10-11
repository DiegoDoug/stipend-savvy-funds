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
      {/* Sidebar - always visible on desktop (md+), slides in on mobile */}
      <aside 
        className={`
          fixed left-0 top-0 h-full flex items-center bg-card z-50 shadow-lg
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <SidebarDock onClose={onClose} />
      </aside>
    </>
  );
}
