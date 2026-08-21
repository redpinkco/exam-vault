import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../lib/supabase";

// ==========================================
// 💡 การตั้งค่าระบบหลัก
// ==========================================

// 1️⃣ เปลี่ยนเลขนี้ทุกครั้งที่มีการอัปเดตฟีเจอร์หรือแก้บั๊ก! 
// ระบบจะบังคับให้นักเรียนโหลดหน้าเว็บใหม่และล้างแคชเก่าอัตโนมัติ
const APP_VERSION = "1.0.1"; 

// 2️⃣ รายชื่อแอดมิน (สามารถล็อกอินพร้อมกันหลายเครื่องได้)
const ADMIN_EMAILS = [
  "ttanasak@gmail.com"
];

// ==========================================

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#0f766e" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Exam Vault" },
      { title: "คลังสอบ | Exam Vault คลังข้อสอบเก่าสอบเข้า ม.1" },
      {
        name: "description",
        content: "คลังข้อสอบเก่าสอบเข้า ม.1 พร้อมห้องสอบเสมือนจริง จับเวลา และแผนที่ข้อสอบ",
      },
      { property: "og:title", content: "คลังสอบ | Exam Vault" },
      {
        property: "og:description",
        content: "ฝึกทำข้อสอบเก่าสอบเข้า ม.1 ทั้ง EP, ISM และภาคธรรมดา ในห้องสอบเสมือนจริง",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // 1️⃣ ระบบสแกนเวอร์ชันแอป: บังคับล้างแคชและรีเฟรชเมื่อแอดมินปล่อยอัปเดตใหม่
  useEffect(() => {
    const currentLocalVersion = localStorage.getItem("app_version");
    
    if (currentLocalVersion !== APP_VERSION) {
      console.log("🔥 พบแอปเวอร์ชันใหม่! กำลังล้างแคชและอัปเดต...");
      localStorage.setItem("app_version", APP_VERSION);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        }).then(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  }, []);

  // 2️⃣ ระบบ Auth & ป้องกันล็อกอินซ้อน
  useEffect(() => {
    // ดักจับการ Logout ปกติ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.navigate({ to: '/login', replace: true });
      }
    });

    // ตั้งเวลาเช็กการล็อกอินซ้อน (ทุกๆ 5 วินาที)
    const checkSessionInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const cleanEmail = session.user.email.toLowerCase().trim();

      // ข้ามการตรวจล็อกอินซ้อนถ้าเป็นแอดมิน
      if (ADMIN_EMAILS.includes(cleanEmail)) return;

      // ดึงค่า Token ของเครื่องที่ล็อกอินล่าสุดมาจากฐานข้อมูล
      const { data: student } = await supabase
        .from('students')
        .select('session_token')
        .eq('email', cleanEmail)
        .single();

      if (student) {
        const localToken = localStorage.getItem("student_session");
        
        // ถ้ารหัส Token ในเครื่องนี้ ไม่ตรงกับรหัสเครื่องล่าสุดในฐานข้อมูล = โดนเตะออก
        if (student.session_token && localToken !== student.session_token) {
          clearInterval(checkSessionInterval);
          alert("⚠️ มีการเข้าสู่ระบบบัญชีนี้จากอุปกรณ์อื่น\n\nระบบจะทำการออกจากระบบในอุปกรณ์นี้โดยอัตโนมัติ");
          await supabase.auth.signOut();
          localStorage.removeItem("student_session");
          window.location.href = "/login";
        }
      }
    }, 5000); // 5000 ms = 5 วินาที

    return () => {
      subscription.unsubscribe();
      clearInterval(checkSessionInterval); // เคลียร์ Interval เมื่อเปลี่ยนหน้า/ปิดคอมโพเนนต์
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}