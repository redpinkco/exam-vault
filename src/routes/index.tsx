import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, GraduationCap, Sparkles, Lock, Loader2, ChevronLeft, ChevronRight, BookOpen, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "เลือกชั้นเรียน | Exam Vault" },
      { name: "description", content: "เลือกระดับชั้นเพื่อฝึกทำข้อสอบเก่าเสมือนจริง" },
    ],
  }),
  component: GradeSelection,
});

const GRADE_DATA = [
  {
    id: "ป.6",
    title: "ประถมศึกษาปีที่ 6",
    badge: "สอบเข้า ม.1 ยอดนิยม",
    desc: "ข้อสอบจริงย้อนหลังกว่า 7 ปี ครบทุกแผนการเรียน EP, ISM และห้องธรรมดา พร้อมระบบจำลองบรรยากาศสอบจริง",
    accent: "from-blue-600 via-indigo-600 to-cyan-500",
    glow: "rgba(59, 130, 246, 0.25)",
    iconBg: "bg-blue-500/10 text-blue-600 border-blue-200/50",
  },
  {
    id: "ป.5",
    title: "ประถมศึกษาปีที่ 5",
    badge: "เตรียมความพร้อมล่วงหน้า",
    desc: "ตะลุยคลังโจทย์เข้มข้น ปูพื้นฐานความแม่นยำทางวิชาการเพื่อเตรียมตัวขึ้นสู่สนามสอบ ป.6 อย่างมั่นใจ",
    accent: "from-emerald-500 via-teal-600 to-cyan-600",
    glow: "rgba(16, 185, 129, 0.25)",
    iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
  },
  {
    id: "ป.4",
    title: "ประถมศึกษาปีที่ 4",
    badge: "ปูรากฐานสำคัญ",
    desc: "ปรับพื้นฐานและฝึกทักษะการคิดวิเคราะห์ 3 วิชาหลัก คณิตศาสตร์ วิทยาศาสตร์ และภาษาอังกฤษ",
    accent: "from-amber-500 via-orange-500 to-rose-500",
    glow: "rgba(245, 158, 11, 0.25)",
    iconBg: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  },
];

function GradeSelection() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchPermissionsAndAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate({ to: "/login", replace: true });
          return;
        }

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

    fetchPermissionsAndAuth();
  }, [navigate]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % GRADE_DATA.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + GRADE_DATA.length) % GRADE_DATA.length);
  };

  return (
    <PageShell>
      {/* Ambient Glow Background Layer */}
      <div className="relative isolate overflow-hidden pt-4 pb-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 -translate-x-1/2 blur-3xl opacity-60">
          <div className="h-[400px] w-[800px] bg-gradient-to-r from-blue-400/20 via-teal-300/30 to-amber-200/20 rounded-full" />
        </div>

        {/* Hero Title Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-slate-700 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="size-4 text-amber-500 fill-amber-400" />
            <span>ระบบฝึกทำข้อสอบเสมือนจริง • ข้อสอบกว่า 7 ปีการศึกษา</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            เลือกชั้นเรียนเพื่อเริ่มฝึกฝน
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            ก้าวสู่สนามสอบอย่างมั่นใจด้วยคลังข้อสอบคัดพิเศษ พร้อมวิเคราะห์จุดแข็ง-จุดอ่อนเฉพาะบุคคล
          </p>
        </div>

        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="size-9 animate-spin text-primary mb-3" />
            <p className="font-medium text-sm">กำลังตรวจสอบสิทธิ์การใช้งาน...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Interactive 3D Carousel Showcase */}
            <div className="relative max-w-4xl mx-auto px-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="size-3.5" /> รายการระดับชั้นทั้งหมด
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={prevSlide}
                    className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 text-slate-700 shadow-sm hover:bg-white active:scale-95 transition-all"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 text-slate-700 shadow-sm hover:bg-white active:scale-95 transition-all"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </div>

              {/* Cards Grid with Liquid Glass Texture */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GRADE_DATA.map((grade, idx) => {
                  const hasAccess = permissions && permissions[grade.id] === true;
                  const isFeatured = idx === activeIndex;

                  if (hasAccess) {
                    return (
                      <Link
                        key={grade.id}
                        to="/programs"
                        className={`group relative rounded-3xl p-7 transition-all duration-500 flex flex-col justify-between overflow-hidden backdrop-blur-xl border ${
                          isFeatured
                            ? "bg-white/85 border-white shadow-[0_20px_50px_rgba(30,58,138,0.12)] ring-2 ring-primary/30 -translate-y-2"
                            : "bg-white/60 border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/80 hover:-translate-y-1"
                        }`}
                      >
                        {/* Soft Glow Reflection */}
                        <div
                          className="absolute -top-20 -right-20 size-48 rounded-full blur-2xl pointer-events-none opacity-40 transition-opacity group-hover:opacity-70"
                          style={{ background: grade.glow }}
                        />

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`flex size-14 items-center justify-center rounded-2xl border shadow-inner ${grade.iconBg}`}>
                              <GraduationCap className="size-7" />
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="size-3.5" /> พร้อมใช้งาน
                            </span>
                          </div>

                          <div className="mt-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{grade.badge}</span>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{grade.id}</h3>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{grade.title}</p>
                            <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-3">
                              {grade.desc}
                            </p>
                          </div>
                        </div>

                        {/* Claymorphism 3D Button */}
                        <div className="mt-8 pt-4 border-t border-slate-100/80 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">เลือกแผนการเรียน</span>
                          <span className="flex items-center justify-center size-10 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white shadow-[0_4px_0_0_#0f766e,0_8px_15px_rgba(15,118,110,0.3)] group-hover:translate-x-1 group-active:translate-y-0.5 group-active:shadow-[0_2px_0_0_#0f766e] transition-all">
                            <ArrowRight className="size-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  }

                  // Locked State
                  return (
                    <div
                      key={grade.id}
                      className="relative rounded-3xl p-7 backdrop-blur-md bg-white/40 border border-white/40 shadow-none flex flex-col justify-between opacity-60 select-none grayscale-[40%]"
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
                          <span className="text-xs font-semibold text-slate-400">{grade.badge}</span>
                          <h3 className="text-2xl font-bold text-slate-500 mt-1">{grade.id}</h3>
                          <p className="mt-3 text-xs leading-relaxed text-slate-400">
                            {grade.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-200/50 flex items-center justify-between text-slate-400 text-xs font-bold">
                        <span>ยังไม่มีสิทธิ์เข้าถึง</span>
                        <Lock className="size-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}