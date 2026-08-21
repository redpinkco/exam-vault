import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Calculator, ChevronRight, Globe2, Sparkles, Lock, Loader2, ShieldCheck, ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PROGRAMS, type ProgramId } from "@/lib/exam-data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "เลือกแผนการเรียน | Exam Vault" },
      { name: "description", content: "เลือกแผนการเรียนที่ต้องการสอบเข้า" },
    ],
  }),
  component: ProgramSelection,
});

const ICONS: Record<ProgramId, typeof Globe2> = {
  ep: Globe2,
  ism: Calculator,
  regular: Sparkles,
};

const DB_PERMISSION_KEYS: Record<ProgramId, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
};

const PROGRAM_THEMES: Record<ProgramId, { glow: string; color: string; border: string }> = {
  ep: { glow: "rgba(99, 102, 241, 0.2)", color: "from-indigo-500 to-blue-600", border: "hover:border-indigo-300" },
  ism: { glow: "rgba(16, 185, 129, 0.2)", color: "from-teal-500 to-emerald-600", border: "hover:border-emerald-300" },
  regular: { glow: "rgba(245, 158, 11, 0.2)", color: "from-amber-500 to-orange-600", border: "hover:border-amber-300" },
};

function ProgramSelection() {
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const { data, error } = await supabase
            .from("students")
            .select("permissions")
            .eq("email", session.user.email)
            .single();

          if (data && !error) {
            setPermissions(data.permissions);
          }
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return (
    <PageShell>
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
          <ChevronLeft className="size-4" /> เลือกระดับชั้น
        </Link>
        <ChevronRight className="size-3.5 text-slate-300" />
        <span className="font-bold text-slate-800">เลือกแผนการเรียน</span>
      </nav>

      {/* Header Info */}
      <div className="max-w-2xl space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
          <Sparkles className="size-3.5" /> แผนการเรียนเฉพาะทาง
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          เลือกแผนการเรียนที่ต้องการสอบ
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          ระบบจะเปิดชุดข้อสอบตรงตามโครงสร้างวิชาสอบของแต่ละแผนการเรียนที่คุณได้รับสิทธิ์
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="size-9 animate-spin text-primary mb-3" />
          <p className="font-medium text-sm">กำลังตรวจสอบสิทธิ์แผนการเรียน...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {Object.values(PROGRAMS).map((program) => {
            const Icon = ICONS[program.id];
            const dbKey = DB_PERMISSION_KEYS[program.id as ProgramId];
            const hasAccess = permissions && permissions[dbKey] === true;
            const theme = PROGRAM_THEMES[program.id as ProgramId] || PROGRAM_THEMES.regular;

            if (hasAccess) {
              return (
                <Link
                  key={program.id}
                  to="/hub/$program"
                  params={{ program: program.id }}
                  className={`group relative rounded-3xl p-7 flex flex-col justify-between backdrop-blur-xl bg-white/75 border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_45px_rgba(15,118,110,0.12)] hover:bg-white/90 hover:-translate-y-1.5 transition-all duration-300 ${theme.border}`}
                >
                  {/* Subtle Glow Reflection */}
                  <div
                    className="absolute -top-16 -right-16 size-40 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ background: theme.glow }}
                  />

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-white text-slate-700 shadow-inner group-hover:scale-105 group-hover:text-primary transition-all">
                        <Icon className="size-7" />
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="size-3.5" /> มีสิทธิ์เข้าสอบ
                      </span>
                    </div>

                    <div className="mt-6">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{program.name}</h2>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{program.fullName}</p>
                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        {program.tagline}
                      </p>
                    </div>

                    {/* Clay Badges for Subjects */}
                    <div className="mt-6 flex flex-wrap gap-1.5">
                      {program.subjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/70 shadow-sm"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3D Action Strip */}
                  <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">เข้าสู่ศูนย์สอบ</span>
                    <span className="flex items-center justify-center size-9 rounded-xl bg-primary text-white shadow-[0_3px_0_0_#0f766e] group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              );
            }

            // Locked Card
            return (
              <div
                key={program.id}
                className="relative rounded-3xl p-7 flex flex-col justify-between backdrop-blur-md bg-white/40 border border-white/40 shadow-none opacity-60 select-none grayscale-[40%]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-400 border border-slate-300/40">
                      <Lock className="size-6" />
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      <Lock className="size-3" /> ถูกล็อก
                    </span>
                  </div>

                  <div className="mt-6">
                    <h2 className="text-2xl font-bold text-slate-500">{program.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{program.fullName}</p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {program.tagline}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {program.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200/40"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200/50 flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>ไม่มีสิทธิ์เข้าถึง</span>
                  <Lock className="size-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}