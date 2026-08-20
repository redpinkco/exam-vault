import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // เพิ่มตัวแปรเก็บข้อความ Error
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(""); // ล้างข้อความ Error เก่าก่อน

    try {
      // 1. ส่งข้อมูลไปถาม Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // ถ้าล็อกอินไม่ผ่าน (รหัสผิด / ไม่มีเมลนี้)
        setErrorMsg("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      } else {
        // 2. ถ้าล็อกอินผ่าน เช็คว่าเป็น Admin หรือไม่
        if (email === "ttanasak@gmail.com") {
          // ถ้าเป็น Admin พาเข้าหน้า Dashboard
          navigate({ to: "/admin" });
        } else {
          // ถ้าเป็นนักเรียน พาไปหน้าแรกเพื่อเริ่มทำข้อสอบ
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

          {/* กล่องแสดงแจ้งเตือน Error สีแดง (ถ้ามี) */}
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