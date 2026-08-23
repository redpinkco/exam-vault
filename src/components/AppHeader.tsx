import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import logo from "@/assets/logo.png";
import { UserCircle, LogOut, BarChart3, History, ChevronDown, User, Trophy, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ADMIN_EMAIL = "ttanasak@gmail.com";

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDropdownOpen(false);
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-3 z-40 w-full px-4 sm:px-8 lg:px-12 transition-all">
      <div className="glass-dock squircle mx-auto w-full max-w-screen-2xl px-4 sm:px-8 h-16 flex items-center justify-between transition-all duration-300">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-teal-50 border border-primary/20 p-1.5 shadow-inner transition-transform group-hover:scale-105">
            <img src={logo} alt="โลโก้คลังสอบ" width={512} height={512} className="size-full object-contain" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-black tracking-tight text-slate-800">คลังสอบ</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Exam Vault</span>
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            to={"/leaderboard" as any}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black text-amber-800 bg-gradient-to-b from-amber-100 to-amber-200/80 hover:from-amber-200 hover:to-amber-300 border border-amber-300/80 shadow-[0_2px_0_0_#d97706] active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Trophy className="size-3.5 text-amber-600 fill-amber-500" />
            <span className="hidden sm:inline">ตารางจัดอันดับ</span>
          </Link>

          {isLoading ? (
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-slate-200/60" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-white transition-all shadow-sm active:scale-95"
              >
                <div className="flex size-5 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="size-3.5" />
                </div>
                <span className="hidden sm:inline-block max-w-[140px] truncate">
                  {user.email}
                </span>
                <ChevronDown className={`size-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-3xl border border-white/90 bg-white/95 backdrop-blur-2xl p-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3.5 py-2.5 mb-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">บัญชีผู้ใช้งาน</p>
                    <p className="text-xs font-black text-slate-800 truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    {user.email?.toLowerCase() === ADMIN_EMAIL && (
                      <Link
                        to="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm mb-1"
                      >
                        <LayoutDashboard className="size-4" />
                        ไปหน้าผู้ดูแลระบบ (Admin)
                      </Link>
                    )}

                    <Link
                      to={"/leaderboard" as any}
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50/80 transition-colors"
                    >
                      <Trophy className="size-4 text-amber-500 fill-amber-500" />
                      ตารางจัดอันดับ (Hall of Fame)
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <BarChart3 className="size-4" />
                      แดชบอร์ดสรุปคะแนน
                    </Link>

                    <Link
                      to={"/history" as any}
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <History className="size-4" />
                      ประวัติการสอบ & แบบฝึกหัด
                    </Link>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="size-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-primary px-4 py-2 text-xs font-bold text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-0.5 active:shadow-none hover:opacity-95 transition-all"
            >
              <UserCircle className="size-4" />
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}