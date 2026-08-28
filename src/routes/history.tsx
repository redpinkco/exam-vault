import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { 
  History, BookOpen, ChevronLeft, Loader2, Calendar, 
  CheckCircle2, XCircle, Lightbulb, X, Flame, FileSearch, FilePenLine, Video, RefreshCw,
  Check, Filter, Award, Download, Printer, ExternalLink, Sparkles
} from "lucide-react";

// อิมพอร์ตระบบสมการคณิตศาสตร์
import 'katex/dist/katex.min.css';
// @ts-ignore
import Latex from 'react-latex-next';

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

  // State สำหรับ Modal ดูเฉลยละเอียดทุกข้อ
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [fullExamQuestions, setFullExamQuestions] = useState<any[]>([]);
  const [isLoadingFullExam, setIsLoadingFullExam] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "wrong">("all");

  // State สำหรับ Modal เกียรติบัตร
  const [certRecord, setCertRecord] = useState<any>(null);
  const certRef = useRef<HTMLDivElement>(null);

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
        setStudent({ name: "นักเรียน", examHistory: [], worksheetHistory: [], lessonHistory: [] });
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

  const handleOpenReviewModal = async (record: any) => {
    setViewingHistory(record);
    setReviewFilter("all");
    setIsLoadingFullExam(true);

    try {
      const { data: examData } = await supabase
        .from('exams')
        .select('questions')
        .eq('id', record.exam_id)
        .maybeSingle();

      if (examData && Array.isArray(examData.questions) && examData.questions.length > 0) {
        setFullExamQuestions(examData.questions);
      } else {
        setFullExamQuestions((record.mistakes || []).map((m: any) => m.question_data || m));
      }
    } catch (err) {
      console.error("Failed to load full exam questions:", err);
      setFullExamQuestions((record.mistakes || []).map((m: any) => m.question_data || m));
    } finally {
      setIsLoadingFullExam(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
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
  const worksheets = Array.isArray(student.worksheetHistory) ? student.worksheetHistory : [];
  const lessons = Array.isArray(student.lessonHistory) ? student.lessonHistory : [];
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
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">ประวัติการสอบ & บทเรียน</h1>
          <p className="text-sm text-slate-500">ตรวจสอบประวัติการทำแบบทดสอบ แบบฝึกหัด บทเรียนที่เข้าชม และดาวน์โหลดเกียรติบัตร</p>
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
            <FilePenLine className="size-4" /> ประวัติทำแบบฝึกหัด ({worksheets.length})
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "lessons" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Video className="size-4" /> ประวัติเข้าเรียน ({lessons.length})
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
                    const isPassed = percent >= 70;
                    
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

                        <div className="flex flex-col gap-2 mt-1">
                          <button 
                            onClick={() => handleOpenReviewModal(record)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <FileSearch className="size-4" /> ดูเฉลยและช้อยส์ทุกข้อ
                          </button>

                          {isPassed && (
                            <button
                              onClick={() => setCertRecord(record)}
                              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Award className="size-4" /> รับเกียรติบัตร (ผ่านเกณฑ์)
                            </button>
                          )}
                        </div>
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
                          ข้อ {m.qIndex + 1}. <Latex>{m.question}</Latex>
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

        {/* TAB 3: WORKSHEETS */}
        {activeTab === "worksheets" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 sm:p-8">
              {worksheets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {worksheets.map((w: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg">หน้าที่ {w.page}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="size-3.5"/> {w.date}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-800">{w.title}</h3>
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 line-clamp-3">
                          {w.feedback}
                        </div>
                      </div>
                      <Link 
                        to={`/worksheet/${w.worksheet_id}` as any}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl text-center transition-colors"
                      >
                        กลับไปทำแบบฝึกหัดหน้านี้
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <FilePenLine className="size-12 mx-auto opacity-20" />
                  <p className="font-semibold text-sm">ยังไม่มีประวัติการส่งแบบฝึกหัด</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LESSONS (ปลดล็อกสมบูรณ์แล้ว) */}
        {activeTab === "lessons" && (
          <div className="backdrop-blur-xl bg-white/80 border border-white/80 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 sm:p-8">
              {lessons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                            {lesson.subject || "บทเรียน"}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="size-3.5"/> {lesson.date}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-800 leading-snug">{lesson.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">แผนการเรียน: {lesson.program || "ทั่วไป"}</p>
                      </div>

                      <Link 
                        to="/hub/$program"
                        params={{ program: (lesson.program || "ism").toLowerCase() }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm mt-auto"
                      >
                        <Video className="size-4" /> ดูบทเรียนนี้ซ้ำ
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Video className="size-12 mx-auto opacity-20 text-indigo-600" />
                  <p className="font-semibold text-sm">ยังไม่มีประวัติการเข้าเรียนวิดีโอ</p>
                  <p className="text-xs">เมื่อคุณกดดูคลิปการสอนในหน้าศูนย์การเรียนรู้ ระบบจะบันทึกประวัติให้ที่นี่อัตโนมัติครับ</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Modal: ดูเฉลยข้อสอบแบบครบเครื่อง */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/90 gap-4">
              <div>
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                  <BookOpen className="size-6 text-primary" /> ทบทวนเฉลยข้อสอบ
                </h3>
                <p className="text-sm font-bold text-slate-600 mt-0.5">{viewingHistory.title}</p>
                <div className="text-xs text-slate-400 mt-1 flex gap-4 font-semibold">
                  <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-md">คะแนน: {viewingHistory.score} / {viewingHistory.total}</span>
                  <span>วันที่สอบ: {viewingHistory.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setReviewFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${reviewFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setReviewFilter("correct")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${reviewFilter === "correct" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    ถูก (✓)
                  </button>
                  <button
                    onClick={() => setReviewFilter("wrong")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${reviewFilter === "wrong" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    ผิด (✗)
                  </button>
                </div>

                <button onClick={() => setViewingHistory(null)} className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition shadow-sm">
                  <X className="size-5"/>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-100/50 space-y-6">
              {isLoadingFullExam ? (
                <div className="py-24 text-center text-slate-400 space-y-3">
                  <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-bold">กำลังดึงชุดข้อสอบและตัวเลือกทั้งหมด...</p>
                </div>
              ) : fullExamQuestions.length > 0 ? (
                fullExamQuestions
                  .map((q: any, idx: number) => {
                    const mistakeItem = (viewingHistory.mistakes || []).find((m: any) => m.qIndex === idx);
                    const isWrong = !!mistakeItem;
                    const isCorrect = !isWrong;
                    const userGivenAnswer = mistakeItem ? mistakeItem.userAnswer : undefined;

                    return {
                      qIndex: idx,
                      question: q.question,
                      type: q.type || "choice",
                      options: q.options || [],
                      correct_index: q.correct_index,
                      subjective_answers: q.subjective_answers || [],
                      explanation: q.explanation || mistakeItem?.explanation,
                      image_url: q.image_url,
                      isCorrect,
                      userGivenAnswer
                    };
                  })
                  .filter((item: any) => {
                    if (reviewFilter === "correct") return item.isCorrect;
                    if (reviewFilter === "wrong") return !item.isCorrect;
                    return true;
                  })
                  .map((item: any) => {
                    const hasImage = item.image_url && item.image_url !== "NEEDS_IMAGE";

                    return (
                      <div 
                        key={item.qIndex} 
                        className={`bg-white p-6 sm:p-8 rounded-3xl border shadow-sm space-y-5 transition-all ${
                          item.isCorrect ? "border-emerald-200 bg-white" : "border-rose-200 bg-rose-50/20"
                        }`}
                      >
                        <div className="flex gap-4 items-start justify-between pb-4 border-b border-slate-100">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black bg-slate-800 text-white px-3 py-1 rounded-lg">
                                ข้อที่ {item.qIndex + 1}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border">
                                {item.type === "subjective" ? "อัตนัย" : "ปรนัย"}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line">
                              <Latex>{item.question}</Latex>
                            </p>
                          </div>

                          <span className={`shrink-0 px-3.5 py-1.5 text-xs font-black rounded-xl flex items-center gap-1.5 ${
                            item.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                          }`}>
                            {item.isCorrect ? <Check className="size-4 text-emerald-600"/> : <XCircle className="size-4 text-rose-600"/>}
                            {item.isCorrect ? "ถูกต้อง" : "ตอบผิด"}
                          </span>
                        </div>

                        {hasImage && (
                          <div className="flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-100 w-fit mx-auto shadow-inner">
                            <img src={item.image_url} alt="Question Graphic" className="max-h-60 rounded-xl object-contain" />
                          </div>
                        )}

                        {item.type === "choice" ? (
                          <div className="space-y-2.5 pt-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ตัวเลือกทั้งหมด:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {item.options.map((opt: string, optIdx: number) => {
                                const isCorrectChoice = optIdx === item.correct_index;
                                const isUserChoice = item.userGivenAnswer === optIdx;

                                let choiceContainerStyle = "border-slate-200 bg-slate-50/60 text-slate-700";
                                let badgeStyle = "bg-slate-200 text-slate-700";

                                if (isCorrectChoice) {
                                  choiceContainerStyle = "border-emerald-400 bg-emerald-50/90 text-emerald-950 font-bold ring-1 ring-emerald-400 shadow-sm";
                                  badgeStyle = "bg-emerald-600 text-white";
                                } else if (isUserChoice && !item.isCorrect) {
                                  choiceContainerStyle = "border-rose-400 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-400";
                                  badgeStyle = "bg-rose-600 text-white";
                                }

                                return (
                                  <div 
                                    key={optIdx} 
                                    className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between gap-3 transition-all ${choiceContainerStyle}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`size-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${badgeStyle}`}>
                                        {choiceLabels[optIdx] || optIdx + 1}
                                      </span>
                                      <span className="leading-relaxed"><Latex>{opt}</Latex></span>
                                    </div>

                                    {isCorrectChoice && (
                                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
                                        ✓ เฉลยที่ถูก
                                      </span>
                                    )}
                                    {isUserChoice && !item.isCorrect && (
                                      <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded-md shrink-0">
                                        ✗ คุณเลือกข้อนี้
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {!item.isCorrect && (
                              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-900">
                                <p className="text-xs font-bold opacity-60 uppercase mb-1">คำตอบที่คุณพิมพ์:</p>
                                <p className="text-base font-black"><Latex>{item.userGivenAnswer || "ไม่ได้ตอบ"}</Latex></p>
                              </div>
                            )}
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-900">
                              <p className="text-xs font-bold opacity-60 uppercase mb-1">คำตอบที่ถูกต้อง:</p>
                              <p className="text-base font-black"><Latex>{(item.subjective_answers || []).join(" หรือ ")}</Latex></p>
                            </div>
                          </div>
                        )}

                        {item.explanation && item.explanation !== "ไม่มีคำอธิบายเพิ่มเติม" && (
                          <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm sm:text-base text-slate-700 space-y-2 mt-4">
                            <p className="font-bold text-primary flex items-center gap-2 text-base">
                              <Lightbulb className="size-5 text-amber-500"/> วิธีทำอย่างละเอียด:
                            </p>
                            <p className="whitespace-pre-line leading-relaxed text-slate-600 pl-7"><Latex>{item.explanation}</Latex></p>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-400">
                  <p className="text-base font-bold">ไม่พบข้อมูลข้อสอบ</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ✅ Modal: เกียรติบัตรรับรองผลสอบ */}
      {certRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-amber-600" />
                <span className="font-bold text-sm text-slate-800">เกียรติบัตรรับรองผลการสอบ</span>
              </div>
              <button onClick={() => setCertRecord(null)} className="p-2 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="size-5"/>
              </button>
            </div>

            {/* ใบประกาศนียบัตร */}
            <div className="p-8 sm:p-12 overflow-y-auto flex justify-center bg-slate-100/50">
              <div 
                ref={certRef}
                className="w-full max-w-2xl bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 p-8 sm:p-12 rounded-3xl border-8 border-double border-amber-300 shadow-xl text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 size-32 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 size-32 bg-teal-200/30 rounded-full blur-2xl pointer-events-none" />

                <div className="flex justify-center mb-4">
                  <span className="p-4 bg-amber-100 text-amber-600 rounded-full shadow-inner border border-amber-200">
                    <Award className="size-12" />
                  </span>
                </div>

                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-800/80">CERTIFICATE OF ACHIEVEMENT</p>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1 mb-6">เกียรติบัตรผ่านเกณฑ์มาตรฐาน</h2>

                <p className="text-xs sm:text-sm text-slate-500 mb-2">ขอมอบเกียรติบัตรฉบับนี้เพื่อแสดงว่า</p>
                <p className="text-xl sm:text-2xl font-black text-primary mb-6 underline decoration-amber-300 decoration-wavy underline-offset-8">
                  {student.name || student.email}
                </p>

                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  ได้ผ่านการทดสอบวัดประเมินผลในชุดข้อสอบ <br />
                  <span className="font-bold text-slate-800 text-sm sm:text-base">"{certRecord.title}"</span>
                </p>

                <div className="inline-flex items-center gap-6 my-6 bg-white/80 border border-amber-200/80 px-6 py-3 rounded-2xl shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">คะแนนที่ได้</p>
                    <p className="text-lg font-black text-emerald-600">{certRecord.score} / {certRecord.total}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">คิดเป็น</p>
                    <p className="text-lg font-black text-amber-600">{Math.round((certRecord.score / certRecord.total) * 100)}%</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  ให้ไว้ ณ วันที่ {certRecord.date || new Date().toLocaleDateString("th-TH")} • Exam Vault Thailand
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
              <button 
                onClick={() => setCertRecord(null)}
                className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
              <button 
                onClick={handlePrintCertificate}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
              >
                <Printer className="size-4" /> พิมพ์ / บันทึก PDF
              </button>
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
              <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line"><Latex>{retryModalItem.question}</Latex></p>

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
                        <span className="leading-relaxed"><Latex>{opt}</Latex></span>
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
                <div className="p-4 bg-slate-50 rounded-2xl border text-xs sm:text-sm text-slate-700 space-y-1.5 animate-in fade-in"><p className="font-bold text-amber-600 flex items-center gap-1.5"><Lightbulb className="size-4" /> วิธีทำ:</p><p className="whitespace-pre-line text-slate-600 leading-relaxed"><Latex>{retryModalItem.explanation}</Latex></p></div>
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