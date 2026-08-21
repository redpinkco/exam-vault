import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { 
  BarChart3, History, BookOpen, Award, ChevronLeft, Loader2, 
  Calendar, AlertCircle, RefreshCw, CheckCircle2, XCircle, Lightbulb, X, TrendingUp
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: StudentDashboard,
});

// ฟังก์ชันแปลง key วิชาเป็นชื่อภาษาไทยและสี (แก้ไขให้ถูกหลัก TypeScript Strict Mode)
const getSubjectInfo = (key: string) => {
  const subjects: Record<string, { label: string, color: string, bg: string }> = {
    math: { label: "คณิตศาสตร์", color: "bg-blue-500", bg: "bg-blue-100" },
    science: { label: "วิทยาศาสตร์", color: "bg-emerald-500", bg: "bg-emerald-100" },
    english: { label: "ภาษาอังกฤษ", color: "bg-rose-500", bg: "bg-rose-100" },
    thai: { label: "ภาษาไทย", color: "bg-amber-500", bg: "bg-amber-100" },
    social: { label: "สังคมศึกษา", color: "bg-purple-500", bg: "bg-purple-100" }
  };
  
  const info = subjects[key];
  // ถ้าหาวิชาไม่เจอ ให้คืนค่า Default กลับไปเสมอ (ป้องกัน undefined)
  return info ? info : { label: "อื่นๆ", color: "bg-slate-500", bg: "bg-slate-100" };
};

function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "mistakes">("history");

  // State สำหรับ Modal ฝึกทำข้อที่ผิดซ้ำ
  const [retryModalItem, setRetryModalItem] = useState<any>(null);
  const [retryAnswer, setRetryAnswer] = useState<any>("");
  const [retryStatus, setRetryStatus] = useState<"idle" | "correct" | "wrong">("idle");

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
          mistakeBank: [],
          scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 }
        });
      } else {
        setStudent(data);
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
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="size-8 animate-spin mb-4 text-primary" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </PageShell>
    );
  }

  if (!student) return null;

  const history = Array.isArray(student.examHistory) ? student.examHistory : [];
  const mistakes = Array.isArray(student.mistakeBank) ? student.mistakeBank : [];
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

  // ฟังก์ชันเริ่มทำข้อสอบที่ผิดซ้ำ
  const handleOpenRetry = (item: any) => {
    setRetryModalItem(item);
    setRetryAnswer("");
    setRetryStatus("idle");
  };

  // ตรวจคำตอบที่ทำซ้ำ
  const handleCheckRetry = async () => {
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
      // ลบข้อที่ตอบถูกออกจาก Mistake Bank ทันที!
      const updatedMistakes = mistakes.filter((m: any) => m.id !== retryModalItem.id);
      setStudent((prev: any) => ({ ...prev, mistakeBank: updatedMistakes }));
      
      if (typeof student.id === "number") {
        await supabase.from("students").update({ mistakeBank: updatedMistakes }).eq("id", student.id);
      }
    } else {
      setRetryStatus("wrong");
    }
  };

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  return (
    <PageShell>
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ChevronLeft className="size-4" /> กลับหน้าหลัก
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">แดชบอร์ดส่วนตัว</h1>
          <p className="mt-2 text-slate-500">ยินดีต้อนรับ, <span className="font-semibold text-primary">{student.name}</span></p>
        </div>

        {/* ส่วนที่ 1: สรุปภาพรวม & วิเคราะห์ความถนัด (Skills Analysis) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* กล่องตัวเลข */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 flex-1">
              <div className="p-4 rounded-full bg-primary/10 text-primary"><BookOpen className="size-8"/></div>
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">ทำข้อสอบไปแล้ว</p>
                <p className="text-3xl font-black text-slate-800">{totalExamsTaken} <span className="text-base font-medium text-slate-500">ชุด</span></p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 flex-1">
              <div className="p-4 rounded-full bg-amber-100 text-amber-600"><Award className="size-8"/></div>
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">คะแนนเฉลี่ยรวม</p>
                <p className="text-3xl font-black text-slate-800">{avgScore} <span className="text-base font-medium text-slate-500">%</span></p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 flex-1">
              <div className="p-4 rounded-full bg-rose-100 text-rose-600"><AlertCircle className="size-8"/></div>
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">คลังข้อที่ต้องทบทวน</p>
                <p className="text-3xl font-black text-slate-800">{mistakes.length} <span className="text-base font-medium text-slate-500">ข้อ</span></p>
              </div>
            </div>
          </div>

          {/* กราฟแท่งวิเคราะห์จุดอ่อน */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <TrendingUp className="size-5 text-primary" /> วิเคราะห์ความถนัดรายวิชาล่าสุด
            </h3>
            
            <div className="space-y-5">
              {["math", "science", "english", "thai", "social"].map((key) => {
                const info = getSubjectInfo(key);
                const score = scores[key] || 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-bold text-slate-700">{info.label}</span>
                      <span className="text-sm font-bold text-slate-500">{score}%</span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${info.bg}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${info.color}`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalExamsTaken === 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl font-medium text-center">
                * กราฟจะแสดงผลเมื่อคุณเริ่มทำข้อสอบในระบบอย่างน้อย 1 ชุด
              </div>
            )}
          </div>
        </div>

        {/* เมนูแท็บสลับ History vs Mistake Bank */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border shadow-inner">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "history" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="size-4" /> ประวัติการสอบ ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("mistakes")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "mistakes" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertCircle className="size-4" /> ข้อที่ตอบผิด ({mistakes.length})
          </button>
        </div>

        {/* ส่วนที่ 2: ประวัติการทำข้อสอบ */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="border-b p-5 flex items-center gap-2 bg-slate-50/50">
              <History className="size-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-800">ประวัติการทำข้อสอบล่าสุด</h2>
            </div>
            
            <div className="p-5">
              {history.length > 0 ? (
                <div className="space-y-4">
                  {[...history].reverse().map((record: any, idx: number) => {
                    const recordTotal = record.total || 1;
                    const percent = Math.round((record.score / recordTotal) * 100);
                    
                    return (
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
                            <span className="text-lg font-bold text-slate-800">{percent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <BookOpen className="size-12 mx-auto mb-3 opacity-20" />
                  <p>คุณยังไม่เคยทำข้อสอบในระบบ เริ่มฝึกทำข้อสอบกันเลย!</p>
                  <Link to="/programs" className="inline-block mt-4 text-primary font-semibold hover:underline">
                    ไปเลือกชั้นเรียน
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ส่วนที่ 3: คลังข้อที่ตอบผิด (Mistake Bank) */}
        {activeTab === "mistakes" && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="border-b p-5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-800">คลังข้อสอบที่เคยตอบผิด</h2>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                ต้องฝึกซ้ำ {mistakes.length} ข้อ
              </span>
            </div>

            <div className="p-5">
              {mistakes.length > 0 ? (
                <div className="space-y-4">
                  {mistakes.map((m: any, idx: number) => (
                    <div key={m.id || idx} className="p-5 rounded-2xl border border-rose-100 bg-rose-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold transition shadow-sm shrink-0"
                      >
                        <RefreshCw className="size-4" /> ฝึกทำข้อนี้ซ้ำ
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="size-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                  <p className="text-emerald-700 font-bold">ไม่มีข้อสอบที่ทำผิดค้างอยู่!</p>
                  <p className="text-xs text-slate-400 mt-1">คุณทำข้อสอบได้ถูกต้องครบถ้วน หรือยังไม่ได้เริ่มทำชุดข้อสอบ</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ฝึกทำข้อที่ผิดซ้ำ (Retry Modal) */}
      {retryModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-5 text-rose-500" />
                <h3 className="font-bold text-slate-800">ฝึกทำข้อสอบซ้ำ</h3>
              </div>
              <button onClick={() => setRetryModalItem(null)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="my-6 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              <p className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg w-fit">
                {retryModalItem.subject} • {retryModalItem.exam_title}
              </p>
              
              <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                {retryModalItem.question}
              </p>

              {/* รูปภาพประกอบโจทย์ ถ้ามี */}
              {retryModalItem.question_data?.image_url && retryModalItem.question_data.image_url !== "NEEDS_IMAGE" && (
                <div className="my-4 flex justify-center">
                  <img src={retryModalItem.question_data.image_url} alt="Question" className="max-h-48 object-contain rounded-xl border p-2 bg-slate-50" />
                </div>
              )}

              {/* ช้อยส์ หรือ ช่องพิมพ์ */}
              {retryModalItem.question_data?.type === "choice" ? (
                <div className="space-y-2 pt-2">
                  {retryModalItem.question_data?.options?.map((opt: string, optIdx: number) => (
                    <button
                      key={optIdx}
                      onClick={() => { setRetryAnswer(optIdx); setRetryStatus("idle"); }}
                      className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition flex items-center gap-3 ${
                        retryAnswer === optIdx
                          ? "border-primary bg-primary/5 text-primary font-bold ring-1 ring-primary shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`size-6 shrink-0 rounded-full flex items-center justify-center text-xs border ${
                        retryAnswer === optIdx ? "bg-primary text-white border-primary" : "border-slate-300"
                      }`}>
                        {choiceLabels[optIdx] || optIdx + 1}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">พิมพ์คำตอบที่ถูกต้อง:</label>
                  <input
                    type="text"
                    value={retryAnswer}
                    onChange={(e) => { setRetryAnswer(e.target.value); setRetryStatus("idle"); }}
                    placeholder="พิมพ์คำตอบที่นี่..."
                    className="w-full p-3.5 rounded-xl border-2 border-slate-200 focus:border-primary outline-none font-bold text-sm text-slate-800"
                  />
                </div>
              )}

              {/* สถานะผลการตอบซ้ำ */}
              {retryStatus === "correct" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="size-5 text-emerald-600" /> ยอดเยี่ยมมาก! คุณตอบถูกต้องแล้ว (ข้อนี้ถูกลบออกจากคลังแล้ว)
                </div>
              )}

              {retryStatus === "wrong" && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold flex items-center gap-2 animate-in shake">
                  <XCircle className="size-5 text-red-600" /> ยังไม่ถูกต้อง ลองคิดคำนวณใหม่อีกครั้งนะครับ!
                </div>
              )}

              {/* เฉลยละเอียด (เปิดเมื่อตอบถูก) */}
              {retryStatus === "correct" && retryModalItem.explanation && (
                <div className="p-4 bg-slate-50 rounded-xl border text-sm text-slate-700 space-y-2 animate-in fade-in">
                  <p className="font-bold text-amber-600 flex items-center gap-1.5"><Lightbulb className="size-4" /> วิธีทำ:</p>
                  <p className="whitespace-pre-line pl-5">{retryModalItem.explanation}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex gap-3 mt-auto shrink-0">
              <button
                onClick={() => setRetryModalItem(null)}
                className="flex-1 py-3.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                ปิด
              </button>
              {retryStatus !== "correct" && (
                <button
                  onClick={handleCheckRetry}
                  disabled={retryAnswer === "" || retryAnswer === undefined}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow disabled:opacity-50 transition-colors"
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