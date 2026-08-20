import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import logo from "@/assets/logo.png";
import { UserCircle, LogOut, BarChart3, History, ChevronDown, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  
  // เพิ่ม State ตรวจสอบการโหลด เพื่อไม่ให้ปุ่มแวบ
  const [isLoading, setIsLoading] = useState(true); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false); // โหลดเสร็จแล้ว ปิดตัวโหลด
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        
        {/* ส่วนโลโก้ด้านซ้าย */}
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary p-1.5">
            <img src={logo} alt="โลโก้คลังสอบ" width={512} height={512} className="size-full object-contain" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">คลังสอบ</span>
            <span className="text-[11px] text-muted-foreground">Exam Vault</span>
          </span>
        </Link>

        {/* ส่วนปุ่มเมนูด้านขวา */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            // === ระหว่างโหลด (0.1 วินาทีแรก) โชว์กล่องเทาๆ ป้องกันปุ่มแวบ ===
            <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-100"></div>
          ) : user ? (
            // === กรณี: ล็อกอินแล้ว (แสดง Dropdown) ===
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" />
                </div>
                <span className="hidden sm:inline-block max-w-[120px] truncate">
                  {user.email}
                </span>
                <ChevronDown className={`size-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* เมนู Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 mb-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">ลงชื่อเข้าใช้ด้วย</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {/* 💡 แก้ลิงก์ไปหน้า /dashboard */}
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <BarChart3 className="size-4" />
                      แดชบอร์ดสรุปคะแนน
                    </Link>
                    
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <History className="size-4" />
                      ประวัติการทำข้อสอบ
                    </Link>

                    {/* ปุ่มข้อมูลส่วนตัว ให้ชี้ไปหน้าแดชบอร์ดเช่นกัน หรือปรับเปลี่ยนได้ในอนาคต */}
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <UserCircle className="size-4" />
                      ข้อมูลส่วนตัว
                    </Link>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="size-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // === กรณี: เผื่ออนาคตเอาไปใช้หน้า Landing Page สาธารณะ ===
            <Link 
              to="/login" 
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserCircle className="size-5" />
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
        
      </div>
    </header>
  );
}