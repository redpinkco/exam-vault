import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { BarChart3, History, BookOpen, Award, ChevronLeft, Loader2, Calendar } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (error) throw error;
      setStudent(data);
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="size-8 animate-spin mb-4 text-primary" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </PageShell>
    );
  }

  if (!student) return null;

  const history = student.examHistory || [];
  const scores = student.scores || {};

  // คำนวณจำนวนข้อสอบที่ทำไปแล้ว และคะแนนเฉลี่ยรวม
  const totalExamsTaken = history.length;
  const avgScore = totalExamsTaken > 0 
    ? Math.round(history.reduce((acc: number, curr: any) => acc + (curr.score / curr.total) * 100, 0) / totalExamsTaken)
    : 0;

  return (
    <PageShell>
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ChevronLeft className="size-4" /> กลับหน้าหลัก
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">แดชบอร์ดนักเรียน</h1>
          <p className="mt-2 text-slate-500">ยินดีต้อนรับ, <span className="font-semibold text-primary">{student.name}</span></p>
        </div>

        {/* ส่วนที่ 1: สรุปภาพรวม */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary"><BookOpen className="size-8"/></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">ทำข้อสอบไปแล้ว</p>
              <p className="text-3xl font-black text-slate-800">{totalExamsTaken} <span className="text-base font-medium text-slate-500">ชุด</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-amber-100 text-amber-600"><Award className="size-8"/></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">คะแนนเฉลี่ยรวม</p>
              <p className="text-3xl font-black text-slate-800">{avgScore} <span className="text-base font-medium text-slate-500">%</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-emerald-100 text-emerald-600"><BarChart3 className="size-8"/></div>
            <div className="w-full">
              <p className="text-sm font-semibold text-slate-500 mb-1">ความถนัดล่าสุด (คณิต)</p>
              <p className="text-3xl font-black text-slate-800">{scores.math || 0} <span className="text-base font-medium text-slate-500">%</span></p>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 2: ประวัติการทำข้อสอบ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="border-b p-5 flex items-center gap-2 bg-slate-50/50">
            <History className="size-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">ประวัติการทำข้อสอบล่าสุด</h2>
          </div>
          
          <div className="p-5">
            {history.length > 0 ? (
              <div className="space-y-4">
                {[...history].reverse().map((record: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-primary/30 transition-colors gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                          {record.program || "ทั่วไป"}
                        </span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          วิชา {record.subject}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800">{record.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5">
                        <Calendar className="size-3.5" /> ทำเมื่อ: {record.date || "ไม่ระบุ"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 bg-white px-4 py-2 rounded-xl border shadow-sm">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 mb-0.5">ได้คะแนน</p>
                        <p className="text-lg font-black text-emerald-600">{record.score} <span className="text-sm text-slate-400">/ {record.total}</span></p>
                      </div>
                      <div className="h-10 w-px bg-slate-200"></div>
                      <div className="text-center w-12">
                        <span className="text-lg font-bold text-slate-800">{Math.round((record.score / record.total) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BookOpen className="size-12 mx-auto mb-3 opacity-20" />
                <p>คุณยังไม่เคยทำข้อสอบในระบบ เริ่มฝึกทำข้อสอบกันเลย!</p>
                <Link to="/" className="inline-block mt-4 text-primary font-semibold hover:underline">
                  ไปเลือกชั้นเรียน
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageShell>
  );
}