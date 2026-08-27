import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Download, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../lib/supabase";

const APP_VERSION = "1.0.3"; 

const ADMIN_EMAILS = [
  "ttanasak@gmail.com"
];

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

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // 1️⃣ ระบบสแกนเวอร์ชันแอป
  useEffect(() => {
    const currentLocalVersion = localStorage.getItem("app_version");
    
    if (currentLocalVersion !== APP_VERSION) {
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

  // 2️⃣ ระบบ PWA Auto-Install สำหรับ Samsung Tablet & Android
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  // 3️⃣ ระบบ Auth & ป้องกันล็อกอินซ้อน
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.navigate({ to: '/login', replace: true });
      }
    });

    const checkSessionInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const cleanEmail = session.user.email.toLowerCase().trim();

      if (ADMIN_EMAILS.includes(cleanEmail)) return;

      const { data: student } = await supabase
        .from('students')
        .select('session_token')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (student) {
        const localToken = localStorage.getItem("student_session");
        
        if (student.session_token && localToken !== student.session_token) {
          clearInterval(checkSessionInterval);
          alert("⚠️ มีการเข้าสู่ระบบบัญชีนี้จากอุปกรณ์อื่น\n\nระบบจะทำการออกจากระบบในอุปกรณ์นี้โดยอัตโนมัติ");
          await supabase.auth.signOut();
          localStorage.removeItem("student_session");
          window.location.href = "/login";
        }
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(checkSessionInterval);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />

      {/* แถบแจ้งเตือนติดตั้งแอปสำหรับ Tablet/Mobile */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-[999] max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
              <Download className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm">ติดตั้ง Exam Vault ลงเครื่อง</p>
              <p className="text-xs text-slate-400">เข้าทำข้อสอบได้รวดเร็วเต็มหน้าจอ</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              ติดตั้งทันที
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}