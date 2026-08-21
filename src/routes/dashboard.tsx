import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { 
  History, BookOpen, Award, ChevronLeft, Loader2, 
  Calendar, AlertCircle, RefreshCw, CheckCircle2, XCircle, Lightbulb, X, TrendingUp, Sparkles, Flame
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: StudentDashboard,
});

const getSubjectInfo = (key: string) => {
  const subjects: Record<string, { label: string; color: string; bg: string; text: string; glow: string }> = {
    math: { label: "คณิตศาสตร์", color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-600", glow: "rgba(59, 130, 246, 0.3)" },
    science: { label: "วิทยาศาสตร์", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600", glow: "rgba(16, 185, 129, 0.3)" },
    english: { label: "ภาษาอังกฤษ", color: "from-rose-500 to-pink-600", bg: "bg-rose-50", text: "text-rose-600", glow: "rgba(244, 63, 94, 0.3)" },
    thai: { label: "ภาษาไทย", color: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-600", glow: "rgba(245, 158, 11, 0.3)" },
    social: { label: "สังคมศึกษา", color: "from-purple-500 to-violet-600", bg: "bg-purple-50", text: "text-purple-600", glow: "rgba(168, 85, 247, 0.3)" }
  };
  
  const info = subjects[key];
  return info ? info : { label: "อื่นๆ", color: "from-slate-500 to-slate-600", bg: "bg-slate-50", text: "text-slate-600", glow: "rgba(100, 116, 139, 0.3)" };
};

function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "mistakes">("history");

  const [retryModalItem, setRetryModalItem] = useState<any>(null);
  const [retryAnswer, setRetryAnswer] = useState<any>("");
  const [retryStatus, setRetryStatus] = useState<"idle" | "correct" | "wrong">("idle");
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

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setStudent({
          name: session.user.user_metadata?.['name'] || session.user.email?.split('@')[0] || "นักเรียน",
          email: session.user.email,
          examHistory: [],
          scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 }
        });
        setLocalMistakes([]);
      } else {
        setStudent(data);
        // ดึงข้อผิดจากประวัติการทำข้อสอบ (examHistory)
        const extractedMistakes: any[] = [];
        const historyList = Array.isArray(data.examHistory) ? data.examHistory : [];
        historyList.forEach((h: any) => {
          if (Array.isArray(h.mistakes)) {
            extractedMistakes.push(...h.mistakes);
          }
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
          <p className="text-sm font-semibold">กำลังประมวลผลข้อมูลการเรียนรู้...</p>
        </div>
      </PageShell>
    );
  }

  if (!student) return null;

  const history = Array.isArray(student.examHistory) ? student.examHistory : [];
  const mistakes = localMistakes;
  const scores = student.scores || { math: 0, english: 0, science: 0, thai: 0, social: 0 };

  const totalExamsTaken = history.length;
  const avgScore = totalExamsTaken > 0 
    ? Math.round(
        history.reduce((acc: number, curr: any) => {
          const total = curr.total || 1;
          return acc + (curr.score / total) * 100;
        }, 0) / totalExamsTaken
      )
    : 0;

  const handleOpenRetry = (item: any) => {
    setRetryModalItem(item);
    setRetryAnswer("");
    setRetryStatus("idle");
  };

  const handleCheckRetry = () => {
    if (!retryModalItem) return;
    
    let isCorrect = false;
    if (retryModalItem.question_data?.type === "choice") {
      isCorrect = Number(retryAnswer) === Number(retryModalItem.question_data?.correct_index);
    } else {
      const validAnswers = (retryModalItem.question_data?.subjective_answers || []).map((a: string) => String(a).trim().toLowerCase());
      isCorrect = validAnswers.some((a: string) => a === String(retryAnswer).trim().toLowerCase());
    }

    if (isCorrect) {
      setRetryStatus("correct");
      setLocalMistakes(prev => prev.filter((m: any) => m.id !== retryModalItem.id));
    } else {
      setRetryStatus("wrong");
    }
  };

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  return (
    <PageShell>
      {/* Ambient Glow Background Layer */}
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-10 -z-10 blur-3xl opacity-50">
          <div className="h-72 w-72 bg-gradient-to-br from-primary/30 to-indigo-300 rounded-full" />
        </div>

        {/* Navigation Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
            <ChevronLeft className="size-4" /> กลับหน้าหลัก
          </Link>
        </nav>

        {/* Dashboard Header */}
        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="size-3.5" /> สรุปผลการเรียนรู้รายบุคคล
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">แดชบอร์ดนักเรียน</h1>
          <p className="text-sm text-slate-500">
            ยินดีต้อนรับกลับ, <span className="font-bold text-slate-800">{student.name}</span> ติดตามพัฒนาการและความพร้อมสู่สนามสอบจริง
          </p>
        </div>

        {/* Section 1: 3D Stat Cards & Skills Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          
          {/* Left: 3D Claymorphism Stat Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Stat Card 1: Completed Exams */}
            <div className="group relative rounded-3xl p-6 backdrop-blur-xl bg-white/75 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex items-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-primary text-white shadow-[0_4px_0_0_#0f766e,0_8px_15px_rgba(15,118,110,0.25)] shrink-0">
                <BookOpen className="size-8" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ทำข้อสอบสะสม</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black text-slate-800">{totalExamsTaken}</span>
                  <span className="text-xs font-semibold text-slate-500">ชุด</span>
                </div>
              </div>
            </div>

            {/* Stat Card 2: Average Score */}
            <div className="group relative rounded-3xl p-6 backdrop-blur-xl bg-white/75 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex items-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_0_0_#b45309,0_8px_15px_rgba(245,158,11,0.25)] shrink-0">
                <Award className="size-8" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">คะแนนเฉลี่ยรวม</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black text-amber-600">{avgScore}</span>
                  <span className="text-xs font-semibold text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Stat Card 3: Mistake Bank */}
            <div className="group relative rounded-3xl p-6 backdrop-blur-xl bg-white/75 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex items-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_4px_0_0_#9f1239,0_8px_15px_rgba(244,63,94,0.25)] shrink-0">
                <AlertCircle className="size-8" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">คลังข้อที่ต้องทบทวน</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black text-rose-600">{mistakes.length}</span>
                  <span className="text-xs font-semibold text-slate-500">ข้อ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Skills Analysis (Neon Progress Bars) */}
          <div className="lg:col-span-8 backdrop-blur-xl bg-white/80 border border-white/80 p-7 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="font-black text-base sm:text-lg text-slate-800 flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" /> วิเคราะห์ความถนัดรายวิชาล่าสุด
                </h3>
                <span className="text-[11px] font-bold text-slate-400">ประเมินจากข้อสอบล่าสุด</span>
              </div>
              
              <div className="space-y-4">
                {["math", "science", "english", "thai", "social"].map((key) => {
                  const info = getSubjectInfo(key);
                  const score = scores[key] || 0;
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700">{info.label}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${info.text} ${info.bg}`}>
                          {score}%
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden bg-slate-100 p-0.5 shadow-inner">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${info.color} transition-all duration-1000`}
                          style={{ 
                            width: `${score}%`,
                            boxShadow: `0 0 10px ${info.glow}`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {totalExamsTaken === 0 && (
              <div className="mt-6 p-3.5 bg-amber-50/80 border border-amber-200 text-amber-800 text-xs rounded-2xl font-semibold text-center">
                💡 กราฟจะคำนวณและประเมินผลอัตโนมัติเมื่อเริ่มทำข้อสอบอย่างน้อย 1 ชุด
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Interactive Tabs (History vs Mistake Bank) */}
        <div className="flex bg-white/70 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-slate-200/80 shadow-sm mb-6">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "history" 
                ? "bg-slate-900 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="size-4" /> ประวัติการทำข้อสอบ ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("mistakes")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "mistakes" 
                ? "bg-rose-600 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Flame className="size-4 text-amber-300" /> คลังข้อที่ตอบผิด ({mistakes.length})
          </button>
        </div>

        {/* Tab 1 Content: Exam History */}
        {activeTab === "history" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6">
              {history.length > 0 ? (
                <div className="space-y-3">
                  {[...history].reverse().map((record: any, idx: number) => {
                    const recordTotal = record.total || 1;
                    const percent = Math.round((record.score / recordTotal) * 100);
                    
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 bg-white/90 hover:border-primary/40 hover:shadow-md transition-all gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {record.program || "ทั่วไป"}
                            </span>
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                              วิชา {record.subject}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-slate-800">{record.title}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <Calendar className="size-3.5 text-slate-400" /> ทำเมื่อ: {record.date || "ไม่ระบุ"}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0 bg-slate-50/80 px-5 py-2.5 rounded-2xl border border-slate-100">
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">ได้คะแนน</p>
                            <p className="text-lg font-black text-emerald-600">
                              {record.score} <span className="text-xs text-slate-400">/ {record.total}</span>
                            </p>
                          </div>
                          <div className="h-8 w-px bg-slate-200" />
                          <div className="text-center min-w-[48px]">
                            <span className="text-lg font-black text-slate-800">{percent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <BookOpen className="size-12 mx-auto opacity-20" />
                  <p className="font-semibold text-sm">ยังไม่มีประวัติการสอบ เริ่มฝึกข้อสอบชุดแรกเพื่อสะสมสถิติ</p>
                  <Link to="/programs" className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition">
                    ไปเลือกชั้นเรียน
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 Content: Mistake Bank */}
        {activeTab === "mistakes" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6">
              {mistakes.length > 0 ? (
                <div className="space-y-3">
                  {mistakes.map((m: any, idx: number) => (
                    <div key={m.id || idx} className="p-5 rounded-2xl border border-rose-100 bg-rose-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-rose-300 transition-all">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md">
                            {m.subject}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {m.exam_title}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed line-clamp-2">
                          ข้อ {m.qIndex + 1}. {m.question}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenRetry(m)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs sm:text-sm font-bold transition shadow-[0_4px_0_0_#9f1239] active:translate-y-0.5 active:shadow-none shrink-0"
                      >
                        <RefreshCw className="size-4" /> ฝึกทำข้อนี้ซ้ำ
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="size-14 mx-auto text-emerald-500 opacity-80" />
                  <p className="text-slate-800 font-black text-base">ยอดเยี่ยมมาก! ไม่มีข้อสอบที่ทำผิดค้างอยู่</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    คุณทำข้อสอบได้อย่างถูกต้องครบถ้วน หรือยังไม่ได้เริ่มทำแบบทดสอบ
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Retry Mistake Question */}
      {retryModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="backdrop-blur-2xl bg-white/95 border border-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.2)] animate-in zoom-in-95 overflow-hidden">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <RefreshCw className="size-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-800">ฝึกทำข้อสอบซ้ำ</h3>
                  <p className="text-[11px] text-slate-400">{retryModalItem.subject} • {retryModalItem.exam_title}</p>
                </div>
              </div>
              <button 
                onClick={() => setRetryModalItem(null)} 
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="my-6 overflow-y-auto space-y-4 custom-scrollbar pr-2 flex-1">
              <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                {retryModalItem.question}
              </p>

              {retryModalItem.question_data?.image_url && retryModalItem.question_data.image_url !== "NEEDS_IMAGE" && (
                <div className="my-3 flex justify-center">
                  <img src={retryModalItem.question_data.image_url} alt="Question" className="max-h-48 object-contain rounded-2xl border p-2 bg-white shadow-sm" />
                </div>
              )}

              {retryModalItem.question_data?.type === "choice" ? (
                <div className="space-y-2.5 pt-2">
                  {retryModalItem.question_data?.options?.map((opt: string, optIdx: number) => {
                    const isSelected = retryAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => { setRetryAnswer(optIdx); setRetryStatus("idle"); }}
                        className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary shadow-sm"
                            : "border-slate-200/80 bg-white/70 hover:bg-white text-slate-700 shadow-sm"
                        }`}
                      >
                        <span className={`size-7 shrink-0 rounded-xl flex items-center justify-center text-xs font-black border ${
                          isSelected ? "bg-primary text-white border-primary" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {choiceLabels[optIdx] || optIdx + 1}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">พิมพ์คำตอบที่ถูกต้อง:</label>
                  <input
                    type="text"
                    value={retryAnswer}
                    onChange={(e) => { setRetryAnswer(e.target.value); setRetryStatus("idle"); }}
                    placeholder="พิมพ์คำตอบที่นี่..."
                    className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm text-slate-800 shadow-sm"
                  />
                </div>
              )}

              {retryStatus === "correct" && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" /> 
                  <span>ยอดเยี่ยมมาก! คุณตอบถูกต้องแล้ว (ข้อนี้ถูกลบออกจากคลังข้อผิดเรียบร้อย)</span>
                </div>
              )}

              {retryStatus === "wrong" && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in shake">
                  <XCircle className="size-5 text-rose-600 shrink-0" /> 
                  <span>ยังไม่ถูกต้อง ลองทบทวนวิธีคิดและคำนวณใหม่อีกครั้งนะครับ!</span>
                </div>
              )}

              {retryStatus === "correct" && retryModalItem.explanation && (
                <div className="p-4 bg-slate-50 rounded-2xl border text-xs sm:text-sm text-slate-700 space-y-1.5 animate-in fade-in">
                  <p className="font-bold text-amber-600 flex items-center gap-1.5">
                    <Lightbulb className="size-4" /> วิธีทำ:
                  </p>
                  <p className="whitespace-pre-line text-slate-600 leading-relaxed">{retryModalItem.explanation}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => setRetryModalItem(null)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition text-xs sm:text-sm"
              >
                ปิด
              </button>
              {retryStatus !== "correct" && (
                <button
                  onClick={handleCheckRetry}
                  disabled={retryAnswer === "" || retryAnswer === undefined}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 shadow-[0_4px_0_0_#0f766e] active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition text-xs sm:text-sm"
                >
                  ตรวจคำตอบ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}