import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* แถบเมนูด้านบน (คงไว้เหมือนเดิม) */}
      <AppHeader />
      
      {/* ขยายความกว้างเป็น max-w-7xl และเพิ่ม flex-1 เพื่อให้เนื้อหาเต็มจอพอดี */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 sm:pt-12 flex-1">
        {children}
      </main>
    </div>
  );
}