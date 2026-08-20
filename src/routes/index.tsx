import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Clock, GraduationCap, Library, Lock, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  // 💡 เอา beforeLoad ออกเพื่อป้องกันปัญหาโหลด Token จาก LocalStorage ไม่ทัน
  head: () => ({
    meta: [
      { title: "เลือกชั้นเรียน | คลังสอบ" },
      { name: "description", content: "เลือกชั้นเรียนเพื่อเริ่มฝึกทำข้อสอบเก่า" },
    ],
  }),
  component: GradeSelection,
});

// ข้อมูลพื้นฐานของแต่ละระดับชั้น
const GRADE_DATA = [
  { id: "ป.6", title: "ป.6", badge: "สอบเข้า ม.1", desc: "ข้อสอบจริงจากปี 2560–2566 ครบทั้งแผน EP, ISM และภาคธรรมดา พร้อมระบบจับเวลาเหมือนห้องสอบจริง" },
  { id: "ป.5", title: "ป.5", badge: "เตรียมความพร้อม", desc: "ตะลุยโจทย์ก่อนขึ้นชั้น ป.6" },
  { id: "ป.4", title: "ป.4", badge: "พื้นฐาน", desc: "ปรับพื้นฐานคณิต–วิทย์–อังกฤษ" },
];

function GradeSelection() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ดึงสิทธิ์ของ User ที่ล็อกอินอยู่จากฐานข้อมูล
  useEffect(() => {
    const fetchPermissionsAndAuth = async () => {
      try {
        // 💡 ให้มันรอจนกว่าจะดึง Token ได้จริงๆ
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // ถ้าไม่มี Session จริงๆ ค่อยเตะไปหน้า login
          navigate({ to: "/login", replace: true });
          return;
        }

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

    fetchPermissionsAndAuth();
  }, [navigate]);

  return (
    <PageShell>
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Library className="size-3.5" />
          คลังข้อสอบเก่ากว่า 7 ปีการศึกษา
        </span>
        <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">เลือกชั้นเรียนของคุณ</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          ฝึกทำข้อสอบอย่างเป็นระบบ ไม่กดดัน ทีละก้าว เริ่มจากเลือกชั้นเรียนที่คุณมีสิทธิ์เข้าถึง
        </p>
      </div>

      {isLoading ? (
        <div className="mt-20 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4 text-primary" />
          <p>กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {GRADE_DATA.map((grade) => {
            // เช็กว่ามีสิทธิ์ในระดับชั้นนี้หรือไม่
            const hasAccess = permissions && permissions[grade.id] === true;

            // ถ้ามีสิทธิ์ แสดงการ์ดที่กดได้
            if (hasAccess) {
              return (
                <Link
                  key={grade.id}
                  to="/programs"
                  className="card-surface group relative overflow-hidden p-7 transition-all hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="absolute -right-10 -top-10 size-40 rounded-full bg-secondary/70" aria-hidden />
                  <div className="relative">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <GraduationCap className="size-6" />
                    </span>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold">{grade.title}</h2>
                      <Badge className="bg-accent text-accent-foreground hover:bg-accent">{grade.badge}</Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">พร้อมใช้งาน</Badge>
                    </div>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {grade.desc}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      เริ่มเลือกแผนการเรียน
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            }

            // ถ้าไม่มีสิทธิ์ แสดงการ์ดล็อคกุญแจ
            return (
              <div
                key={grade.id}
                aria-disabled
                className="card-surface p-7 opacity-60 shadow-none select-none relative overflow-hidden"
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Lock className="size-6" />
                    </span>
                    <Badge variant="outline" className="gap-1 text-muted-foreground bg-slate-50">
                      <Lock className="size-3" />
                      ถูกล็อก (ไม่มีสิทธิ์)
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-muted-foreground">{grade.title}</h2>
                    <Badge variant="outline" className="text-muted-foreground">{grade.badge}</Badge>
                  </div>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {grade.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}