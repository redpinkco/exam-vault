import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { 
  History, BookOpen, ChevronLeft, Loader2, Calendar, 
  CheckCircle2, XCircle, Lightbulb, X, Flame, FileSearch, FilePenLine, Video, RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"exams" | "mistakes" | "worksheets" | "lessons">("exams");

  const [retryModalItem, setRetryModalItem] = useState<any>(null);
  const [retryAnswer, setRetryAnswer] = useState<any>("");
  const [retryStatus, setRetryStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [localMistakes, setLocalMistakes] = useState<any[]>([]);
  const [viewingHistory, setViewingHistory] = useState<any>(null);

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
        setStudent({ name: "นักเรียน", examHistory: [] });
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
          <p className="text-sm font-semibold">กำลังดึงข้อมูลประวัติการเรียน...</p>
        </div>
      </PageShell>
    );
  }

  if (!student) return null;

  const history = Array.isArray(student.examHistory) ? student.examHistory : [];
  const mistakes = localMistakes;

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
      <div className="relative isolate overflow-hidden pb-16">
        <div className="pointer-events-none absolute -top-20 right-10 -z-10 blur-3xl opacity-50">
          <div className="h-72 w-72 bg-gradient-to-br from-primary/30 to-rose-300 rounded-full" />
        </div>

        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
            <ChevronLeft className="size-4" /> กลับหน้าหลัก
          </Link>
        </nav>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">ประวัติการสอบ & แบบฝึกหัด</h1>
          <p className="text-sm text-slate-500">ตรวจสอบประวัติการทำแบบทดสอบ แบบฝึกหัด และทบทวนข้อที่ทำพลาด</p>
        </div>

        {/* Interactive Tabs */}
        <div className="flex flex-wrap bg-white/70 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-slate-200/80 shadow-sm mb-8 gap-1">
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "exams" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="size-4" /> ประวัติทำข้อสอบ ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("mistakes")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "mistakes" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Flame className="size-4 text-amber-300" /> คลังข้อที่ตอบผิด ({mistakes.length})
          </button>
          <button
            onClick={() => setActiveTab("worksheets")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "worksheets" ? "bg-primary text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FilePenLine className="size-4" /> ประวัติทำแบบฝึกหัด
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "lessons" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Video className="size-4" /> ประวัติเข้าเรียน
          </button>
        </div>

        {/* TAB 1: EXAM HISTORY */}
        {activeTab === "exams" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 sm:p-8">
              {history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...history].reverse().map((record: any, idx: number) => {
                    const recordTotal = record.total || 1;
                    const percent = Math.round((record.score / recordTotal) * 100);
                    
                    return (
                      <div key={idx} className="flex flex-col p-5 rounded-2xl border border-slate-100 bg-white hover:border-primary/40 hover:shadow-md transition-all gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {record.program || "ทั่วไป"}
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                              {record.subject}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-slate-800 line-clamp-2">{record.title}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                            <Calendar className="size-3.5" /> {record.date || "ไม่ระบุ"}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 mt-auto">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">ได้คะแนน</p>
                            <p className="text-lg font-black text-emerald-600">
                              {record.score} <span className="text-xs text-slate-400">/ {record.total}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">คิดเป็น</p>
                            <span className="text-lg font-black text-slate-800">{percent}%</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => setViewingHistory(record)}
                          className="mt-1 w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <FileSearch className="size-4" /> ดูเฉลยข้อที่ทำผิด
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="size-12 mx-auto opacity-20" />
                  <p className="font-semibold text-sm">ยังไม่มีประวัติการสอบ เริ่มฝึกข้อสอบชุดแรกเพื่อสะสมสถิติ</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MISTAKES BANK */}
        {activeTab === "mistakes" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 sm:p-8">
              {mistakes.length > 0 ? (
                <div className="space-y-4">
                  {mistakes.map((m: any, idx: number) => (
                    <div key={m.id || idx} className="p-5 sm:p-6 rounded-2xl border border-rose-100 bg-rose-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-rose-300 transition-all shadow-sm">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-slate-800 text-white px-2.5 py-1 rounded-md shadow-sm">{m.subject}</span>
                          <span className="text-xs font-semibold text-slate-500 line-clamp-1">{m.exam_title}</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed line-clamp-2">
                          ข้อ {m.qIndex + 1}. {m.question}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenRetry(m)}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold transition shadow-[0_4px_0_0_#9f1239] active:translate-y-0.5 active:shadow-none w-full md:w-auto shrink-0"
                      >
                        <RefreshCw className="size-4" /> ฝึกทำข้อนี้ซ้ำ
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-2 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200">
                  <CheckCircle2 className="size-16 mx-auto text-emerald-500 opacity-80 mb-4" />
                  <p className="text-emerald-800 font-black text-lg">ยอดเยี่ยมมาก! ไม่มีข้อสอบที่ทำผิดค้างอยู่</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3 & 4 */}
        {(activeTab === "worksheets" || activeTab === "lessons") && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="py-24 px-6 text-center text-slate-400 space-y-3">
              {activeTab === "worksheets" ? <FilePenLine className="size-16 mx-auto opacity-20 text-primary" /> : <Video className="size-16 mx-auto opacity-20 text-indigo-600" />}
              <p className="font-black text-xl text-slate-700">กำลังพัฒนาระบบบันทึกประวัติส่วนนี้ 🚧</p>
              <p className="text-sm font-medium">เร็วๆ นี้คุณจะสามารถติดตามประวัติการ{activeTab === "worksheets" ? "ทำแบบฝึกหัด" : "เข้าเรียนวิดีโอ"}ได้ที่นี่!</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: ดูเฉลยข้อสอบ */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" /> ทบทวนเฉลย (ข้อที่ทำผิด)
                </h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">{viewingHistory.title}</p>
                <div className="text-xs text-slate-400 mt-1 flex gap-3">
                  <span>คะแนน: {viewingHistory.score}/{viewingHistory.total}</span>
                  <span>วันที่: {viewingHistory.date}</span>
                </div>
              </div>
              <button onClick={() => setViewingHistory(null)} className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition shadow-sm">
                <X className="size-5"/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-100/50 space-y-6">
              {viewingHistory.mistakes && viewingHistory.mistakes.length > 0 ? (
                viewingHistory.mistakes.map((m: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 sm:p-6 rounded-2xl border border-rose-100 shadow-sm">
                    <div className="flex gap-3 items-start justify-between mb-4 pb-4 border-b border-slate-100">
                      <p className="font-bold text-slate-800 text-base leading-relaxed">
                        ข้อที่ {m.qIndex + 1}. {m.question}
                      </p>
                      <span className="shrink-0 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1">
                        <XCircle className="size-3.5"/> ตอบผิด
                      </span>
                    </div>

                    {m.question_data?.image_url && m.question_data.image_url !== "NEEDS_IMAGE" && (
                       <div className="mb-5 flex justify-center bg-slate-50 p-2 rounded-xl border w-fit">
                         <img src={m.question_data.image_url} alt="Question" className="max-h-48 rounded-lg object-contain" />
                       </div>
                    )}

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                      <p className="text-xs font-bold text-emerald-800 mb-1.5 uppercase tracking-wider opacity-80">คำตอบที่ถูกต้อง:</p>
                      <p className="text-base font-black text-emerald-900">
                        {m.question_data?.type === "choice" 
                          ? m.question_data.options[m.question_data.correct_index] 
                          : (m.question_data?.subjective_answers || []).join(" หรือ ")}
                      </p>
                    </div>

                    {m.explanation && m.explanation !== "ไม่มีคำอธิบายเพิ่มเติม" && (
                       <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
                         <p className="font-bold text-primary flex items-center gap-1.5 mb-3 text-base">
                           <Lightbulb className="size-4"/> คำอธิบาย / วิธีทำ:
                         </p>
                         <p className="whitespace-pre-line leading-loose">{m.explanation}</p>
                       </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-emerald-200">
                  <CheckCircle2 className="size-20 text-emerald-500 mb-4 opacity-90" />
                  <p className="text-xl font-black text-emerald-800 mb-1">ยอดเยี่ยมมาก!</p>
                  <p className="text-sm font-semibold text-emerald-600">ข้อสอบชุดนี้คุณทำคะแนนได้เต็ม ไม่มีข้อผิดให้ทบทวนครับ 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Retry Mistake */}
      {retryModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="backdrop-blur-2xl bg-white/95 border border-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.2)] animate-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><RefreshCw className="size-5" /></span>
                <div>
                  <h3 className="font-black text-base text-slate-800">ฝึกทำข้อสอบซ้ำ</h3>
                  <p className="text-[11px] text-slate-400">{retryModalItem.subject} • {retryModalItem.exam_title}</p>
                </div>
              </div>
              <button onClick={() => setRetryModalItem(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition"><X className="size-5" /></button>
            </div>

            <div className="my-6 overflow-y-auto space-y-4 custom-scrollbar pr-2 flex-1">
              <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line">{retryModalItem.question}</p>

              {retryModalItem.question_data?.image_url && retryModalItem.question_data.image_url !== "NEEDS_IMAGE" && (
                <div className="my-3 flex justify-center"><img src={retryModalItem.question_data.image_url} alt="Question" className="max-h-48 object-contain rounded-2xl border p-2 bg-white shadow-sm" /></div>
              )}

              {retryModalItem.question_data?.type === "choice" ? (
                <div className="space-y-2.5 pt-2">
                  {retryModalItem.question_data?.options?.map((opt: string, optIdx: number) => {
                    const isSelected = retryAnswer === optIdx;
                    return (
                      <button key={optIdx} onClick={() => { setRetryAnswer(optIdx); setRetryStatus("idle"); }} className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center gap-3.5 ${isSelected ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary shadow-sm" : "border-slate-200/80 bg-white/70 hover:bg-white text-slate-700 shadow-sm"}`}>
                        <span className={`size-7 shrink-0 rounded-xl flex items-center justify-center text-xs font-black border ${isSelected ? "bg-primary text-white border-primary" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{choiceLabels[optIdx] || optIdx + 1}</span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">พิมพ์คำตอบที่ถูกต้อง:</label>
                  <input type="text" value={retryAnswer} onChange={(e) => { setRetryAnswer(e.target.value); setRetryStatus("idle"); }} placeholder="พิมพ์คำตอบที่นี่..." className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm text-slate-800 shadow-sm" />
                </div>
              )}

              {retryStatus === "correct" && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2"><CheckCircle2 className="size-5 text-emerald-600 shrink-0" /><span>ยอดเยี่ยมมาก! คุณตอบถูกต้องแล้ว</span></div>}
              {retryStatus === "wrong" && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in shake"><XCircle className="size-5 text-rose-600 shrink-0" /><span>ยังไม่ถูกต้อง ลองใหม่อีกครั้งครับ!</span></div>}
              {retryStatus === "correct" && retryModalItem.explanation && (
                <div className="p-4 bg-slate-50 rounded-2xl border text-xs sm:text-sm text-slate-700 space-y-1.5 animate-in fade-in"><p className="font-bold text-amber-600 flex items-center gap-1.5"><Lightbulb className="size-4" /> วิธีทำ:</p><p className="whitespace-pre-line text-slate-600 leading-relaxed">{retryModalItem.explanation}</p></div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => setRetryModalItem(null)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition text-xs sm:text-sm">ปิดหน้าต่าง</button>
              {retryStatus !== "correct" && <button onClick={handleCheckRetry} disabled={retryAnswer === "" || retryAnswer === undefined} className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 shadow-md transition text-xs sm:text-sm">ตรวจคำตอบ</button>}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}