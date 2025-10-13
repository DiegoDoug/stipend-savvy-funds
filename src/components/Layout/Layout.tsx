import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import DeactivationAlert from "@/components/UI/DeactivationAlert";
import { useAccountStatus } from "@/hooks/useAccountStatus";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isActive } = useAccountStatus();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main content area with proper spacing for sidebar on desktop */}
        <div className="flex-1 min-h-screen flex flex-col md:ml-20 transition-all duration-300">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-20 md:pb-4 lg:pb-6 max-w-7xl mx-auto w-full">
            {!isActive && <DeactivationAlert />}
            <Outlet />
          </main>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}