import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// ✅ แก้ไข: เหลือแค่ ttanasak@gmail.com เป็น Admin คนเดียว
const ADMIN_EMAILS = [
  "ttanasak@gmail.com"
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  // ตรวจสอบว่าผู้ใช้ล็อกอินอยู่แล้วหรือไม่ ถ้ามีให้พาไปหน้าปลายทางทันที
  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        if (ADMIN_EMAILS.includes(userEmail)) {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      }
    };

    checkActiveSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      } else if (data?.user?.email) {
        if (ADMIN_EMAILS.includes(cleanEmail)) {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="flex h-[70vh] w-full items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
            <p className="mt-2 text-sm text-slate-500">ระบบคลังสอบ Exam Vault</p>
          </div>

          {errorMsg && (
            <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">อีเมล (Email)</label>
              <input 
                type="email" 
                required
                value={email}
                placeholder="กรอกอีเมลของคุณ"
                className="w-full mt-1.5 rounded-lg border p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">รหัสผ่าน (Password)</label>
              <input 
                type="password" 
                required
                value={password}
                placeholder="••••••••"
                className="w-full mt-1.5 rounded-lg border p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}