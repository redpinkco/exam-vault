import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Calculator, ChevronRight, Globe2, Sparkles, Lock, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { PROGRAMS, type ProgramId } from "@/lib/exam-data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "เลือกแผนการเรียน | คลังสอบ" },
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

// Map ID จากไฟล์ data ให้ตรงกับ Key ในฐานข้อมูล (ที่ Admin กด)
const DB_PERMISSION_KEYS: Record<ProgramId, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
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
            .from('students')
            .select('permissions')
            .eq('email', session.user.email)
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
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">
          เลือกชั้นเรียน
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">เลือกแผนการเรียน</span>
      </nav>

      <h1 className="mt-5 max-w-2xl text-3xl font-semibold sm:text-4xl">
        เลือกแผนการเรียนที่คุณต้องการสอบเข้า
      </h1>
      <p className="mt-3 max-w-xl text-base text-muted-foreground">
        แต่ละแผนใช้วิชาสอบต่างกัน เราจะแสดงเฉพาะวิชาที่คุณได้รับสิทธิ์ให้ทำแบบทดสอบ
      </p>

      {isLoading ? (
        <div className="mt-20 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4 text-primary" />
          <p>กำลังตรวจสอบสิทธิ์แผนการเรียน...</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {Object.values(PROGRAMS).map((program) => {
            const Icon = ICONS[program.id];
            // ตรวจสอบสิทธิ์โดยแปลง id จากโปรแกรมเป็นชื่อ Key ในฐานข้อมูล
            const dbKey = DB_PERMISSION_KEYS[program.id as ProgramId];
            const hasAccess = permissions && permissions[dbKey] === true;

            // ถ้ามีสิทธิ์ แสดงปุ่มปกติที่กดได้
            if (hasAccess) {
              return (
                <Link
                  key={program.id}
                  to="/hub/$program"
                  params={{ program: program.id }}
                  className="card-surface group flex flex-col p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary/10"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </span>
                  <div className="mt-5 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{program.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{program.fullName}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{program.tagline}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {program.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="font-normal bg-secondary/50">
                        {subject}
                      </Badge>
                    ))}
                  </div>

                  <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    เข้าสู่แผนการเรียนนี้
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            }

            // ถ้าไม่มีสิทธิ์ แสดงการ์ดสีเทา มีกุญแจล็อค และกดไม่ได้
            return (
              <div
                key={program.id}
                className="card-surface flex flex-col p-6 opacity-60 bg-slate-50 shadow-none select-none relative"
              >
                <div className="absolute top-6 right-6">
                  <Badge variant="outline" className="gap-1 bg-white text-muted-foreground">
                    <Lock className="size-3" /> ถูกล็อก
                  </Badge>
                </div>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                  <Lock className="size-6" />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-muted-foreground">{program.name}</h2>
                <p className="text-sm text-muted-foreground">{program.fullName}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{program.tagline}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {program.subjects.map((subject) => (
                    <Badge key={subject} variant="outline" className="font-normal text-muted-foreground">
                      {subject}
                    </Badge>
                  ))}
                </div>

                <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  ไม่มีสิทธิ์เข้าถึง
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}