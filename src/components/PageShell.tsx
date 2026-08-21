import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans w-full overflow-x-hidden">
      {/* Header ลอยด้านบน */}
      <AppHeader />
      
      {/* Container หลัก ปรับให้กว้างแบบ Responsive เต็มจอสูงสุด 2K/4K (max-w-screen-2xl) */}
      <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 pb-20 pt-6 sm:pt-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}