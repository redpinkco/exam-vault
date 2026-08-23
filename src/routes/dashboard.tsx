import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { BookOpen, Award, ChevronLeft, Loader2, AlertCircle, TrendingUp, Sparkles, BarChart3, History, Flame, Lightbulb, Target } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: StudentDashboard,
});

// ✅ จัดสีสันให้สดใสสุดๆ สำหรับทำ Claymorphism
const getSubjectInfo = (key: string) => {
  const subjects: Record<string, { label: string; color: string; bg: string; text: string; glow: string }> = {
    math: { label: "คณิตศาสตร์", color: "from-blue-400 to-indigo-500", bg: "bg-blue-100", text: "text-blue-700", glow: "rgba(59, 130, 246, 0.4)" },
    science: { label: "วิทยาศาสตร์", color: "from-emerald-400 to-teal-500", bg: "bg-emerald-100", text: "text-emerald-700", glow: "rgba(16, 185, 129, 0.4)" },
    english: { label: "ภาษาอังกฤษ", color: "from-rose-400 to-pink-500", bg: "bg-rose-100", text: "text-rose-700", glow: "rgba(244, 63, 94, 0.4)" },
    thai: { label: "ภาษาไทย", color: "from-amber-400 to-orange-500", bg: "bg-amber-100", text: "text-amber-700", glow: "rgba(245, 158, 11, 0.4)" },
    social: { label: "สังคมศึกษา", color: "from-purple-400 to-violet-500", bg: "bg-purple-100", text: "text-purple-700", glow: "rgba(168, 85, 247, 0.4)" },
    aptitude_math: { label: "ความถนัดทางคณิตฯ", color: "from-cyan-400 to-blue-500", bg: "bg-cyan-100", text: "text-cyan-700", glow: "rgba(6, 182, 212, 0.4)" },
    aptitude_eng: { label: "ทักษะภาษาอังกฤษ", color: "from-fuchsia-400 to-purple-500", bg: "bg-fuchsia-100", text: "text-fuchsia-700", glow: "rgba(217, 70, 239, 0.4)" }
  };
  return subjects[key] || { label: "อื่นๆ", color: "from-slate-400 to-slate-500", bg: "bg-slate-100", text: "text-slate-700", glow: "rgba(100, 116, 139, 0.4)" };
};

// 💡 คลาส CSS สำหรับทำกล่องและแท่งกราฟแบบ Claymorphism (นูน 3D, แสงสะท้อนนุ่มๆ)
const clayCardClass = "bg-slate-50 rounded-[2.5rem] shadow-[10px_10px_20px_rgba(0,0,0,0.03),-10px_-10px_20px_rgba(255,255,255,1),inset_2px_2px_4px_rgba(255,255,255,1),inset_-2px_-2px_4px_rgba(0,0,0,0.02)] border border-white/50";
const clayBarInnerClass = "shadow-[inset_2px_2px_4px_rgba(255,255,255,0.5),inset_-2px_-2px_4px_rgba(0,0,0,0.15)]";
const clayBgSinkClass = "shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,1)] bg-slate-100/50";

function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localMistakes, setLocalMistakes] = useState<any[]>([]);

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

      const { data, error } = await supabase.from('students').select('*').eq('email', session.user.email).maybeSingle();
      if (error) throw error;
      
      if (!data) {
        setStudent({
          name: session.user.user_metadata?.['name'] || session.user.email?.split('@')[0] || "นักเรียน",
          email: session.user.email,
          examHistory: [],
          scores: {}
        });
        setLocalMistakes([]);
      } else {
        setStudent(data);
        const extractedMistakes: any[] = [];
        (Array.isArray(data.examHistory) ? data.examHistory : []).forEach((h: any) => {
          if (Array.isArray(h.mistakes)) extractedMistakes.push(...h.mistakes);
        });
        setLocalMistakes(extractedMistakes);
      }
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold">กำลังวิเคราะห์ข้อมูลด้วย AI...</p>
        </div>
      </PageShell>
    );
  }

  if (!student) return null;

  const history = Array.isArray(student.examHistory) ? student.examHistory : [];
  const mistakes = localMistakes;
  const scores = student.scores || {};

  const totalExamsTaken = history.length;
  const avgScore = totalExamsTaken > 0 
    ? Math.round(history.reduce((acc: number, curr: any) => acc + (curr.score / (curr.total || 1)) * 100, 0) / totalExamsTaken)
    : 0;

  // 📊 คำนวณข้อมูลสำหรับกราฟแท่งเปรียบเทียบ (Latest vs Previous)
  const subjectKeys = ["math", "science", "english", "thai", "social", "aptitude_math", "aptitude_eng"];
  const comparisonData = subjectKeys.map(key => {
    const info = getSubjectInfo(key);
    
    // หาประวัติที่ตรงกับวิชานั้นๆ
    const subjectHistory = history.filter((h: any) => {
      if (key === "math" && h.subject.includes("คณิต") && !h.subject.includes("ความถนัด")) return true;
      if (key === "science" && h.subject.includes("วิทย์")) return true;
      if (key === "english" && h.subject.includes("อังกฤษ") && !h.subject.includes("ทักษะ")) return true;
      if (key === "thai" && h.subject.includes("ไทย")) return true;
      if (key === "social" && h.subject.includes("สังคม")) return true;
      if (key === "aptitude_math" && h.subject.includes("ความถนัดทางคณิต")) return true;
      if (key === "aptitude_eng" && h.subject.includes("ทักษะภาษาอังกฤษ")) return true;
      return false;
    });

    const latest = subjectHistory.length > 0 ? subjectHistory[subjectHistory.length - 1] : null;
    const previous = subjectHistory.length > 1 ? subjectHistory[subjectHistory.length - 2] : null;

    return { 
      key, 
      label: info.label, 
      color: info.color,
      glow: info.glow,
      currScore: latest ? Math.round((latest.score / (latest.total || 1)) * 100) : 0, 
      prevScore: previous ? Math.round((previous.score / (previous.total || 1)) * 100) : 0 
    };
  }).filter(d => d.currScore > 0 || d.prevScore > 0); // โชว์เฉพาะวิชาที่เคยสอบ

  return (
    <PageShell>
      <div className="relative isolate overflow-hidden pb-16 bg-slate-100/30">
        {/* Background ambient glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 -translate-x-1/2 blur-3xl opacity-40">
          <div className="h-96 w-[800px] bg-gradient-to-r from-amber-200 via-emerald-200 to-indigo-300 rounded-full" />
        </div>

        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
            <ChevronLeft className="size-4" /> กลับหน้าหลัก
          </Link>
        </nav>

        <div className="space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white shadow-sm text-primary text-xs font-bold border border-slate-100">
            <Sparkles className="size-3.5 text-amber-500" /> วิเคราะห์จุดแข็ง-จุดอ่อนด้วย AI
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm">แดชบอร์ดสรุปสถิติ</h1>
          <p className="text-sm text-slate-500">
            ยินดีต้อนรับ, <span className="font-bold text-primary">{student.name}</span> นี่คือภาพรวมการเรียนรู้ของคุณ
          </p>
        </div>

        {/* 🔗 เมนูนำทาง (Navigation Links) */}
        <div className={`flex flex-wrap p-2 w-fit mb-10 gap-2 ${clayCardClass}`}>
          <button className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all bg-primary text-white shadow-[0_4px_10px_rgba(15,118,110,0.3),inset_2px_2px_4px_rgba(255,255,255,0.3)]">
            <BarChart3 className="size-4" /> แดชบอร์ดสรุปผล
          </button>
          <Link to={"/history" as any} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all text-slate-500 hover:text-slate-800 hover:bg-white/50">
            <History className="size-4" /> ประวัติการสอบ & แบบฝึกหัด
          </Link>
          <Link to={"/history" as any} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all text-slate-500 hover:text-slate-800 hover:bg-white/50">
            <Flame className="size-4 text-amber-500" /> คลังข้อที่ทำผิด ({mistakes.length})
          </Link>
        </div>

        {/* 📊 ส่วนที่ 1: การ์ดสรุปผลแบบ Claymorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 ${clayCardClass}`}>
            <div className={`flex size-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-teal-400 to-primary text-white ${clayBarInnerClass}`}>
              <BookOpen className="size-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ทำข้อสอบสะสม</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-700">{totalExamsTaken}</span>
                <span className="text-sm font-bold text-slate-400">ชุด</span>
              </div>
            </div>
          </div>

          <div className={`p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 ${clayCardClass}`}>
            <div className={`flex size-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-amber-300 to-orange-500 text-white ${clayBarInnerClass}`}>
              <Award className="size-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">คะแนนเฉลี่ยรวม</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-700">{avgScore}</span>
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          <div className={`p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 ${clayCardClass}`}>
            <div className={`flex size-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-rose-400 to-pink-600 text-white ${clayBarInnerClass}`}>
              <AlertCircle className="size-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ต้องทบทวนเพิ่ม</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-700">{mistakes.length}</span>
                <span className="text-sm font-bold text-slate-400">ข้อ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          
          {/* 📈 กราฟแท่งเปรียบเทียบ (Bar Chart) - ฝั่งซ้าย */}
          <div className={`lg:col-span-7 p-7 sm:p-9 ${clayCardClass} flex flex-col`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                  <Target className="size-6 text-indigo-500" /> เปรียบเทียบพัฒนาการ
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">เทียบคะแนน "สอบครั้งล่าสุด" กับ "ครั้งก่อนหน้า"</p>
              </div>
              
              {/* Legend (คำอธิบายกราฟ) */}
              <div className={`flex items-center gap-4 px-4 py-2 rounded-xl ${clayBgSinkClass}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <div className="w-3 h-3 rounded-md bg-slate-300 opacity-60"></div> ก่อนหน้า
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                  <div className="w-3 h-3 rounded-md bg-primary shadow-sm"></div> ล่าสุด
                </div>
              </div>
            </div>

            {comparisonData.length > 0 ? (
              <div className="flex-1 flex items-end gap-2 sm:gap-6 lg:gap-10 border-b-2 border-slate-200/60 pb-2 pt-6 overflow-x-auto custom-scrollbar min-h-[250px]">
                {comparisonData.map(d => (
                  <div key={d.key} className="relative flex flex-col items-center group w-24 sm:w-28 shrink-0 h-full">
                    
                    {/* พื้นที่ของแท่งกราฟ */}
                    <div className="relative h-full w-full flex items-end justify-center">
                       {/* แท่งหลัง (ครั้งก่อนหน้า) */}
                       <div
                         className={`absolute left-2 sm:left-4 bottom-0 w-10 sm:w-12 rounded-t-[1rem] bg-gradient-to-t ${d.color} opacity-30 transition-all duration-1000 origin-bottom`}
                         style={{ height: `${Math.max(d.prevScore, 5)}%` }} // ใส่ขั้นต่ำ 5% ให้เห็นฐานกราฟ
                       >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.prevScore}%</span>
                       </div>
                       
                       {/* แท่งหน้า (ครั้งล่าสุด) ซ้อนทับเหลื่อมกัน */}
                       <div
                         className={`absolute right-2 sm:right-4 bottom-0 w-10 sm:w-12 rounded-t-[1rem] bg-gradient-to-t ${d.color} z-10 transition-all duration-1000 origin-bottom shadow-[inset_2px_2px_6px_rgba(255,255,255,0.5),inset_-2px_-2px_6px_rgba(0,0,0,0.15),-6px_0_15px_rgba(0,0,0,0.08)]`}
                         style={{ height: `${Math.max(d.currScore, 5)}%` }}
                       >
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-black text-slate-800 drop-shadow-sm">{d.currScore}%</span>
                       </div>
                    </div>
                    
                    <span className="mt-4 text-[11px] sm:text-xs font-bold text-slate-600 truncate w-full text-center px-1">{d.label}</span>
                  </div>
                ))}
              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                 <BarChart3 className="size-16" />
                 <p className="text-sm font-bold">ยังไม่มีข้อมูลเปรียบเทียบ (ต้องสอบ 2 ครั้งขึ้นไป)</p>
               </div>
            )}
          </div>

          {/* 🎯 แถบวัดพลัง (Skills Progress) - ฝั่งขวา */}
          <div className={`lg:col-span-5 p-7 sm:p-9 ${clayCardClass} flex flex-col`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <TrendingUp className="size-6 text-emerald-500" /> วิเคราะห์ความถนัด
              </h3>
            </div>
            
            <div className="space-y-6 flex-1">
              {subjectKeys.map((key) => {
                const info = getSubjectInfo(key);
                const score = scores[key] || 0;
                
                // ไม่แสดงวิชาที่ยังไม่เคยสอบ เพื่อไม่ให้รก
                if (totalExamsTaken > 0 && score === 0) return null; 

                return (
                  <div key={key} className="space-y-2.5 group">
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                      <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{info.label}</span>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black ${info.text} ${info.bg} shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05),1px_1px_3px_rgba(255,255,255,1)]`}>
                        {score}%
                      </span>
                    </div>
                    
                    {/* แถบหลุม Claymorphism */}
                    <div className={`w-full h-5 sm:h-6 rounded-full overflow-hidden p-1 sm:p-1.5 ${clayBgSinkClass}`}>
                      {/* แถบนูนสีสัน Claymorphism */}
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${info.color} transition-all duration-1000 ease-out ${clayBarInnerClass}`}
                        style={{ width: `${Math.max(score, 2)}%` }} // ให้มีติ่งโผล่มานิดนึงถ้าคะแนน 0
                      />
                    </div>
                  </div>
                );
              })}

              {totalExamsTaken === 0 && (
                <div className={`mt-6 p-6 flex flex-col items-center justify-center gap-3 text-center rounded-3xl ${clayBgSinkClass}`}>
                  <Lightbulb className="size-8 text-amber-400" /> 
                  <p className="text-sm font-bold text-slate-500">กราฟความถนัดจะแสดงผล<br/>เมื่อคุณทำข้อสอบชุดแรกสำเร็จ</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </PageShell>
  );
}