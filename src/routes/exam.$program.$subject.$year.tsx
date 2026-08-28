import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, X, Award, Lightbulb, 
  Check, XCircle, FileSearch, Eraser, PenTool, 
  TrendingUp, Timer, Bookmark, ArrowRightCircle, RotateCcw,
  Type, Shuffle, Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from 'react-signature-canvas';

// อิมพอร์ตระบบสมการคณิตศาสตร์ LaTeX
import 'katex/dist/katex.min.css';
// @ts-ignore
import Latex from 'react-latex-next';

export const Route = createFileRoute("/exam/$program/$subject/$year")({
  component: ExamSessionPage,
});

const DB_PROGRAM_MAP: Record<string, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
};

const playWarningBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio warning error:", e);
  }
};

const SubjectiveCanvas = ({ answer, onUpdate }: { answer: string; onUpdate: (val: string) => void }) => {
  const sigCanvas = useRef<any>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <PenTool className="size-4 text-amber-600" /> พื้นที่ทดเลข (กระดาษทด)
          </label>
        </div>
        
        <div 
          className="rounded-xl overflow-hidden border border-amber-300 shadow-inner bg-white relative"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #fbbf24 31px, #fbbf24 32px)',
            backgroundSize: '100% 32px',
            backgroundPosition: '0 8px'
          }}
        >
          {/* @ts-ignore */}
          <SignatureCanvas 
            ref={sigCanvas}
            penColor="blue"
            canvasProps={{ className: "w-full h-32 cursor-crosshair" }}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button 
            onClick={handleClear} 
            className="flex-1 py-2.5 rounded-xl border border-amber-300 text-amber-700 bg-white hover:bg-amber-100 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
          >
            <Eraser className="size-4" /> ลบกระดานทด
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
          พิมพ์คำตอบของคุณที่นี่ (ระบบจะตรวจจากช่องนี้)
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="พิมพ์ข้อความ หรือตัวเลขคำตอบที่นี่..."
          className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none text-base font-bold transition-all text-primary"
        />
      </div>
    </div>
  );
};

function ExamSessionPage() {
  const { program, subject, year } = Route.useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  
  const [bookmarkedIndexes, setBookmarkedIndexes] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(5400);

  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [activeResultCard, setActiveResultCard] = useState(0); 

  const [showCertModal, setShowCertModal] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const hasAlerted5Min = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);

  const [statsData, setStatsData] = useState<{
    percentile: number;
    avgScore: number;
    maxScore: number;
    totalTakers: number;
    rankText: string;
  } | null>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : (e as React.MouseEvent).clientY;
    setStartX(clientX);
    setStartY(clientY);
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = 'changedTouches' in e ? e.changedTouches[0]?.clientX || 0 : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0]?.clientY || 0 : (e as React.MouseEvent).clientY;
    
    const diffX = startX - clientX;
    const diffY = startY - clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) setActiveResultCard(prev => Math.min(examResult.details.length - 1, prev + 1));
      else setActiveResultCard(prev => Math.max(0, prev - 1));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeout.current) return;
    
    if (Math.abs(e.deltaX) > 15 || Math.abs(e.deltaY) > 15) {
      if (e.deltaX > 0 || e.deltaY > 0) {
        setActiveResultCard(prev => Math.min(examResult.details.length - 1, prev + 1));
      } else {
        setActiveResultCard(prev => Math.max(0, prev - 1));
      }
      
      wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null }, 250); 
    }
  };

  useEffect(() => {
    if (!showResultModal || !examResult) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActiveResultCard(prev => Math.min(examResult.details.length - 1, prev + 1));
      if (e.key === "ArrowLeft") setActiveResultCard(prev => Math.max(0, prev - 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResultModal, examResult]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitted && Object.keys(userAnswers).length > 0) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userAnswers, isSubmitted]);

  useEffect(() => {
    if (!examData || !student || isSubmitted) return;
    const storageKey = `exam_ans_${examData.id}_student_${student.id}`;
    const dataToSave = { userAnswers, currentIdx, bookmarkedIndexes, timeLeft };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [userAnswers, currentIdx, bookmarkedIndexes, timeLeft, examData, student, isSubmitted]);

  useEffect(() => {
    fetchSessionAndExam();
  }, []);

  useEffect(() => {
    if (!examData || isSubmitted || isSubmitting || examData.is_timed === false) return;

    if (timeLeft === 300 && !hasAlerted5Min.current) {
      hasAlerted5Min.current = true;
      playWarningBeep();
    }

    if (timeLeft <= 0) {
      alert("⏱️ หมดเวลาทำข้อสอบแล้ว! ระบบจะทำการตรวจและส่งคำตอบของคุณโดยอัตโนมัติ");
      handleSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, examData, isSubmitted, isSubmitting]);

  const shuffleQuestionOptions = (rawQuestions: any[]) => {
    return rawQuestions.map((q: any) => {
      if (q.type !== "choice" || !Array.isArray(q.options) || q.options.length <= 1) return q;

      const originalCorrectOption = q.options[q.correct_index];
      const indexedOptions = q.options.map((opt: string, i: number) => ({ opt, originalIndex: i }));

      for (let i = indexedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
      }

      const newOptions = indexedOptions.map((item: any) => item.opt);
      const newCorrectIndex = newOptions.findIndex((opt: string) => opt === originalCorrectOption);

      return {
        ...q,
        options: newOptions,
        correct_index: newCorrectIndex !== -1 ? newCorrectIndex : q.correct_index,
      };
    });
  };

  const fetchSessionAndExam = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("กรุณาเข้าสู่ระบบก่อนทำข้อสอบ");
        navigate({ to: "/login" });
        return;
      }

      const decodedProgram = decodeURIComponent(program).toLowerCase();
      const decodedSubject = decodeURIComponent(subject);
      const dbProgramTarget = DB_PROGRAM_MAP[decodedProgram] || decodedProgram;

      const [studentRes, examRes] = await Promise.all([
        supabase.from('students').select('id, name, email, examHistory, scores').eq('email', session.user.email).maybeSingle(),
        supabase.from('exams')
          .select('id, title, subject, year, program, duration_minutes, is_timed, questions, shuffle_questions')
          .ilike('subject', `%${decodedSubject}%`)
          .eq('year', year)
          .ilike('program', `%${dbProgramTarget}%`)
          .eq('status', 'published')
          .limit(1)
          .maybeSingle()
      ]);

      const currentStudent = studentRes.data || { 
        id: session.user.id, 
        name: session.user.user_metadata?.['name'] || session.user.email?.split('@')[0] || "นักเรียน",
        email: session.user.email, 
        examHistory: [], 
        scores: {} 
      };
      setStudent(currentStudent);

      if (examRes.error || !examRes.data) {
        alert("คุณไม่มีสิทธิ์ หรือไม่พบข้อสอบในแผนการเรียนนี้");
        navigate({ to: "/" });
        return;
      }

      const fetchedExam = examRes.data;
      setExamData(fetchedExam);
      
      const previousAttempts = (currentStudent.examHistory || []).filter((h: any) => h.exam_id === fetchedExam.id);
      const currentAttemptNumber = previousAttempts.length + 1;
      setAttemptCount(currentAttemptNumber);

      const baseQuestions = fetchedExam.questions || [];
      if (currentAttemptNumber > 1) {
        setQuestions(shuffleQuestionOptions(baseQuestions));
      } else {
        setQuestions(baseQuestions);
      }

      const storageKey = `exam_ans_${fetchedExam.id}_student_${currentStudent.id}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setUserAnswers(parsed.userAnswers || {});
          setCurrentIdx(parsed.currentIdx || 0);
          setBookmarkedIndexes(parsed.bookmarkedIndexes || []);
          if (parsed.timeLeft !== undefined && fetchedExam.is_timed !== false) {
            setTimeLeft(parsed.timeLeft);
          } else if (fetchedExam.duration_minutes && fetchedExam.is_timed !== false) {
            setTimeLeft(Number(fetchedExam.duration_minutes) * 60);
          }
        } catch (e) {
          if (fetchedExam.duration_minutes && fetchedExam.is_timed !== false) setTimeLeft(Number(fetchedExam.duration_minutes) * 60);
        }
      } else if (fetchedExam.duration_minutes && fetchedExam.is_timed !== false) {
        setTimeLeft(Number(fetchedExam.duration_minutes) * 60);
      }
    } catch (err) {
      console.error("Error loading exam session:", err);
    }
  };

  if (!examData || !student || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-3">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-sm">กำลังเปิดชุดข้อสอบ...</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).filter(k => userAnswers[k as unknown as number] !== undefined && userAnswers[k as unknown as number] !== "").length;

  const toggleBookmark = (idx: number) => {
    setBookmarkedIndexes(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleJumpToNextUnanswered = () => {
    const nextUnanswered = questions.findIndex((_: any, idx: number) => 
      userAnswers[idx] === undefined || userAnswers[idx] === ""
    );
    if (nextUnanswered !== -1) {
      setCurrentIdx(nextUnanswered);
    } else {
      alert("🎉 คุณตอบข้อสอบครบทุกข้อเรียบร้อยแล้ว!");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isTimeCritical = timeLeft <= 300; 

  const handleSelectChoice = (optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const handleSubjectiveInput = (text: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [currentIdx]: text }));
  };

  const cycleFontSize = () => {
    if (fontSizeLevel === "normal") setFontSizeLevel("large");
    else if (fontSizeLevel === "large") setFontSizeLevel("xlarge");
    else setFontSizeLevel("normal");
  };

  const getQuestionFontSize = () => {
    if (fontSizeLevel === "large") return "text-xl sm:text-2xl";
    if (fontSizeLevel === "xlarge") return "text-2xl sm:text-3xl";
    return "text-lg sm:text-xl";
  };

  const getChoiceFontSize = () => {
    if (fontSizeLevel === "large") return "text-base sm:text-lg";
    if (fontSizeLevel === "xlarge") return "text-lg sm:text-xl";
    return "text-sm sm:text-base";
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let score = 0;
      const details = questions.map((q: any, idx: number) => {
        const uAns = userAnswers[idx];
        let isCorrect = false;

        if (q.type === "choice") {
          isCorrect = Number(uAns) === Number(q.correct_index);
        } else {
          const validAnswers = (q.subjective_answers || []).map((a: string) => String(a).trim().toLowerCase());
          const safeUAns = String(uAns || "").trim().toLowerCase();
          isCorrect = validAnswers.some((ans: string) => ans === safeUAns);
        }

        if (isCorrect) score += 1;

        return {
          qIndex: idx,
          question: q.question,
          type: q.type || "choice",
          options: q.options || [],
          correct_index: q.correct_index,
          subjective_answers: q.subjective_answers || [],
          isCorrect,
          userAnswer: uAns,
          correctAnswer: q.type === "choice" ? q.options[q.correct_index] : (q.subjective_answers || []).join(" หรือ "),
          explanation: q.explanation || "ไม่มีคำอธิบายเพิ่มเติม",
          image_url: q.image_url || ""
        };
      });

      const total = questions.length;
      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      const resultPayload = { score, total, percentage, details };

      setExamResult(resultPayload);
      setIsSubmitted(true);
      setActiveResultCard(0);

      const isFirstAttempt = attemptCount === 1;

      // บันทึกลง Leaderboard Submissions เฉพาะการทำรอบแรก
      if (isFirstAttempt) {
        await supabase.from('exam_submissions').insert([{
          exam_id: examData.id,
          student_id: typeof student.id === 'number' ? student.id : null,
          student_name: student.name || "นักเรียน",
          score: score,
          total: total,
          percentage: percentage,
          program: decodeURIComponent(program),
          subject: examData.subject,
          year: String(examData.year)
        }]);
      }

      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('percentage')
        .eq('exam_id', examData.id);

      if (submissions && submissions.length > 0) {
        const allPercentages = submissions.map(s => Number(s.percentage));
        const totalTakers = allPercentages.length;
        
        const lowerOrEqualCount = allPercentages.filter(p => p <= percentage).length;
        const percentileRank = Math.round((lowerOrEqualCount / totalTakers) * 100);
        
        const sumPercentages = allPercentages.reduce((acc, curr) => acc + curr, 0);
        const avgScore = Math.round(sumPercentages / totalTakers);
        const maxScore = Math.max(...allPercentages);

        let rankText = "มาตรฐานทั่วไป";
        if (percentileRank >= 90) rankText = "ยอดเยี่ยมมาก (Top 10%) 🏆";
        else if (percentileRank >= 75) rankText = "เก่งมาก (Top 25%) 🌟";
        else if (percentileRank >= 50) rankText = "ผ่านเกณฑ์มาตรฐานเฉลี่ย 👍";
        else rankText = "ควรทบทวนเนื้อหาเพิ่มเติม 💡";

        setStatsData({
          percentile: percentileRank,
          avgScore,
          maxScore,
          totalTakers,
          rankText
        });
      }

      const wrongQuestions = details
        .filter((d: any) => !d.isCorrect)
        .map((d: any) => ({
          id: `${examData.id}_${d.qIndex}_${Date.now()}`,
          exam_id: examData.id,
          exam_title: examData.title,
          subject: examData.subject,
          program: decodeURIComponent(program),
          qIndex: d.qIndex,
          question: d.question,
          userAnswer: d.userAnswer,
          explanation: d.explanation,
          question_data: questions[d.qIndex]
        }));

      const currentHistory = Array.isArray(student.examHistory) ? student.examHistory : [];
      const newHistoryRecord = {
        id: Date.now(),
        exam_id: examData.id,
        title: isFirstAttempt ? examData.title : `${examData.title} (รอบที่ ${attemptCount})`,
        subject: examData.subject,
        year: examData.year,
        program: decodeURIComponent(program),
        score: score,
        total: total,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        timeSpent: "เสร็จสิ้น",
        attempt: attemptCount,
        mistakes: wrongQuestions
      };

      const updatedHistory = [...currentHistory, newHistoryRecord];

      // อัปเดตตารางคะแนนเฉลี่ยเฉพาะรอบแรก
      const currentScores = student.scores || { math: 0, english: 0, science: 0, thai: 0, social: 0, aptitude_math: 0, aptitude_eng: 0 };
      let subjectKey = "other";
      if (examData.subject.includes("คณิตศาสตร์")) subjectKey = "math";
      else if (examData.subject.includes("วิทยาศาสตร์")) subjectKey = "science";
      else if (examData.subject.includes("ภาษาอังกฤษ")) subjectKey = "english";
      else if (examData.subject.includes("ภาษาไทย")) subjectKey = "thai";
      else if (examData.subject.includes("สังคม")) subjectKey = "social";
      else if (examData.subject.includes("ความถนัดทางคณิต")) subjectKey = "aptitude_math";
      else if (examData.subject.includes("ทักษะภาษาอังกฤษ")) subjectKey = "aptitude_eng";

      const currentSubjectScore = currentScores[subjectKey] || 0;
      const updatedScores = { 
        ...currentScores, 
        [subjectKey]: isFirstAttempt ? Math.max(currentSubjectScore, percentage) : currentSubjectScore 
      };

      if (typeof student.id === 'number') {
        await supabase.from("students").update({
          examHistory: updatedHistory,
          scores: updatedScores
        }).eq("id", student.id);
      }

      localStorage.removeItem(`exam_ans_${examData.id}_student_${student.id}`);
      setShowResultModal(true); 

    } catch (error) {
      console.error("Error saving exam:", error);
      setShowResultModal(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Header Bar */}
      <header className="w-full max-w-5xl bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              if (answeredCount > 0 && !isSubmitted && !confirm("ต้องการออกจากห้องสอบใช่หรือไม่?\n(ระบบได้บันทึกคำตอบปัจจุบันไว้ให้แล้ว)")) return;
              navigate({ to: "/hub/$program", params: { program } });
            }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition flex items-center gap-1 border border-slate-200"
            title="ออกจากห้องสอบ"
          >
            <ChevronLeft className="size-5" />
            <span className="text-xs font-bold hidden sm:inline">ออก</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-800 line-clamp-1">{examData.title}</h2>
              {attemptCount > 1 && (
                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                  <Shuffle className="size-3" /> สลับช้อยส์ (รอบ {attemptCount})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">ตอบแล้ว {answeredCount} / {questions.length} ข้อ • ปักหมุด {bookmarkedIndexes.length} ข้อ</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          <button
            onClick={cycleFontSize}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-sm"
            title="ปรับขนาดตัวอักษร"
          >
            <Type className="size-4 text-primary" />
            <span>{fontSizeLevel === "normal" ? "ขนาดปกติ" : fontSizeLevel === "large" ? "ขนาดใหญ่" : "ใหญ่พิเศษ"}</span>
          </button>

          {!isSubmitted && examData.is_timed !== false && (
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono font-bold text-sm transition-colors ${
              isTimeCritical ? "bg-red-50 text-red-600 border-red-200 animate-pulse ring-2 ring-red-400/40" : "bg-slate-50 text-slate-700 border-slate-200"
            }`}>
              <Timer className={`size-4 ${isTimeCritical ? "text-red-500 animate-bounce" : "text-slate-500"}`} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <div>
            {isSubmitted ? (
              <button 
                onClick={() => setShowResultModal(true)} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition text-sm"
              >
                <Lightbulb className="size-4" /> ดูข้อถูก-ผิดและอันดับ
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (answeredCount < questions.length) {
                    if(!confirm(`คุณยังทำข้อสอบไม่ครบ (ทำไป ${answeredCount}/${questions.length} ข้อ)\n\nยืนยันที่จะ "ส่งข้อสอบ" เพื่อดูเฉลยและอันดับเลยหรือไม่?`)) return;
                  }
                  handleSubmitExam();
                }} 
                disabled={isSubmitting} 
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <FileSearch className="size-4" /> {isSubmitting ? "กำลังตรวจ..." : "เปิดเฉลย"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-primary/10 text-primary px-3.5 py-1.5 rounded-full">
                  ข้อที่ {currentIdx + 1}
                </span>
                <span className="text-xs font-semibold text-slate-500 px-3 py-1 border rounded-lg bg-slate-50">
                  {currentQ?.type === "subjective" ? "อัตนัย (เขียนตอบ)" : "ปรนัย (ตัวเลือก)"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleBookmark(currentIdx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  bookmarkedIndexes.includes(currentIdx)
                    ? "bg-amber-50 text-amber-600 border-amber-300 shadow-sm"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                }`}
              >
                <Bookmark className={`size-3.5 ${bookmarkedIndexes.includes(currentIdx) ? "fill-amber-500 text-amber-500" : ""}`} />
                <span>{bookmarkedIndexes.includes(currentIdx) ? "ปักหมุดแล้ว" : "ปักหมุดข้อนี้"}</span>
              </button>
            </div>

            <p className={`font-semibold text-slate-800 leading-relaxed mb-6 whitespace-pre-line ${getQuestionFontSize()}`}>
              <Latex>{String(currentQ?.question || "")}</Latex>
            </p>

            {currentQ?.image_url && (
              <div className="mb-6 flex justify-center">
                <img src={currentQ.image_url} alt="Question Graphic" className="max-h-80 object-contain rounded-xl border p-2 bg-slate-50 shadow-sm" />
              </div>
            )}

            {currentQ?.type === "choice" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt: string, optIdx: number) => {
                  const isSelected = userAnswers[currentIdx] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectChoice(optIdx)}
                      className={`p-4 rounded-xl border text-left font-medium transition flex items-center gap-3 ${getChoiceFontSize()} ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary font-bold shadow-sm" 
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`size-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border ${isSelected ? "bg-primary text-white border-primary" : "border-slate-300"}`}>
                        {choiceLabels[optIdx] || optIdx + 1}
                      </span>
                      <span className="leading-relaxed"><Latex>{String(opt)}</Latex></span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <SubjectiveCanvas 
                key={currentIdx}
                answer={userAnswers[currentIdx] || ""} 
                onUpdate={handleSubjectiveInput} 
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t mt-8">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 text-sm border rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 flex items-center gap-1.5 font-medium transition"
            >
              <ChevronLeft className="size-4" /> ก่อนหน้า
            </button>

            <div className="flex items-center gap-2">
              {!isSubmitted && answeredCount < questions.length && (
                <button
                  type="button"
                  onClick={handleJumpToNextUnanswered}
                  className="px-4 py-2.5 text-xs sm:text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="กระโดดไปข้อที่ยังไม่ได้ตอบ"
                >
                  <ArrowRightCircle className="size-4 text-amber-600" /> ไปข้อที่ยังไม่ทำ ({questions.length - answeredCount})
                </button>
              )}

              {isLastQuestion ? (
                <button
                  onClick={() => {
                    if (answeredCount < questions.length && !confirm("คุณยังทำข้อสอบไม่ครบทุกข้อ ยืนยันที่จะส่งข้อสอบหรือไม่?")) return;
                    handleSubmitExam();
                  }}
                  disabled={isSubmitting || isSubmitted}
                  className="px-6 py-2.5 text-sm bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitted ? "ดูผลลัพธ์แล้ว" : "ส่งคำตอบและดูผลสอบ"} <Check className="size-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 text-sm bg-primary text-white font-bold rounded-xl hover:bg-primary/90 flex items-center gap-1.5 transition shadow-sm"
                >
                  ข้อต่อไป <ChevronRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* แผงผังข้อสอบ Navigation Palette */}
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="font-bold text-sm text-slate-800">แผงผังข้อสอบ</h3>
            <div className="flex items-center gap-2.5 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700"><div className="size-2.5 rounded-md bg-emerald-600"></div> ทำแล้ว</span>
              <span className="flex items-center gap-1 text-amber-700"><div className="size-2.5 rounded-md bg-amber-400"></div> ปักหมุด</span>
              <span className="flex items-center gap-1 text-slate-500"><div className="size-2.5 rounded-md bg-slate-100 border border-dashed border-slate-300"></div> ว่าง</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {questions.map((_: any, idx: number) => {
              const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== "";
              const isCurrent = currentIdx === idx;
              const isBookmarked = bookmarkedIndexes.includes(idx);

              let buttonStyle = "bg-slate-100/80 text-slate-600 border border-slate-300 border-dashed hover:bg-slate-200";

              if (isAnswered) {
                buttonStyle = "bg-emerald-600 text-white font-black shadow-sm border border-emerald-700 hover:bg-emerald-700";
              }

              if (isBookmarked) {
                buttonStyle = "bg-amber-400 text-amber-950 font-black border-2 border-amber-500 shadow-sm hover:bg-amber-500";
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-11 rounded-xl text-sm font-bold transition-all relative flex items-center justify-center ${buttonStyle} ${
                    isCurrent ? "ring-4 ring-primary/40 ring-offset-2 scale-105 z-10" : ""
                  }`}
                >
                  <span>{idx + 1}</span>

                  {isAnswered && !isBookmarked && (
                    <span className="absolute top-1 right-1 text-[9px] leading-none text-emerald-200 font-black">
                      ✓
                    </span>
                  )}

                  {isBookmarked && (
                    <Bookmark className="size-3 absolute top-1 right-1 fill-amber-900 text-amber-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP RESULT */}
      {showResultModal && examResult && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col lg:flex-row bg-slate-900/95 backdrop-blur-md overflow-hidden p-0 m-0"
          onWheel={handleWheel}
        >
          {/* ซ้าย: แผงสรุปคะแนน */}
          <div className="w-full lg:w-[400px] h-[35vh] lg:h-full bg-white flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.2)] shrink-0 overflow-y-auto custom-scrollbar z-50 rounded-b-3xl lg:rounded-none lg:rounded-r-3xl">
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="text-center pb-6 border-b border-slate-100">
                <Award className="size-16 text-amber-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-slate-800">สรุปผลการทดสอบ</h2>
                <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-2">{examData.title}</p>
                {attemptCount > 1 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full mt-3 inline-block border border-amber-200">
                    รอบที่ {attemptCount} (ฝึกซ้ำ)
                  </span>
                )}
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-6 gap-6">
                <div className="inline-flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 px-8 py-6 rounded-[2rem] shadow-sm w-full relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 size-24 bg-amber-200/50 rounded-full blur-2xl"></div>
                  <div className="absolute -left-4 -bottom-4 size-24 bg-amber-300/30 rounded-full blur-2xl"></div>
                  
                  <span className="text-6xl font-extrabold text-amber-600 relative z-10">{examResult.score}</span>
                  <span className="text-3xl font-medium text-amber-600/30 relative z-10">/</span>
                  <span className="text-4xl font-bold text-amber-700 relative z-10">{examResult.total}</span>
                </div>

                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, examResult.percentage)}%` }}></div>
                </div>
                <div className="text-base font-bold text-amber-800">คิดเป็น {examResult.percentage}%</div>

                {statsData && (
                  <div className="w-full bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-3xl shadow-sm text-center">
                    <TrendingUp className="size-8 text-indigo-600 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Percentile Rank</p>
                    <p className="text-lg font-black text-indigo-900 mt-0.5">ชนะผู้สอบ {statsData.percentile}%</p>
                    
                    <div className="mt-4 pt-4 border-t border-indigo-100/60 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/60 p-2 rounded-xl">
                        <p className="text-slate-400 text-[10px] mb-0.5">ผู้สอบทั้งหมด</p>
                        <p className="font-bold text-indigo-900">{statsData.totalTakers} คน</p>
                      </div>
                      <div className="bg-white/60 p-2 rounded-xl">
                        <p className="text-slate-400 text-[10px] mb-0.5">คะแนนเฉลี่ยระบบ</p>
                        <p className="font-bold text-indigo-900">{statsData.avgScore}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {examResult.percentage >= 70 && (
                <button 
                  onClick={() => setShowCertModal(true)}
                  className="w-full py-3.5 mb-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold transition shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0"
                >
                  <Award className="size-4" /> รับเกียรติบัตรผลการสอบ 🏆
                </button>
              )}

              <button 
                onClick={() => { setShowResultModal(false); navigate({ to: "/programs" }); }}
                className="w-full py-4 mt-auto bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition shadow-md text-sm shrink-0"
              >
                กลับสู่หน้าหลัก
              </button>
            </div>
          </div>

          {/* ขวา: Slider เฉลยข้อสอบ */}
          <div 
            className="flex-1 relative flex items-center justify-center h-[65vh] lg:h-full p-4 lg:p-10 select-none z-10"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={(e) => { if(isDragging) handleDragEnd(e) }}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
          >
             <button 
                onClick={() => { setShowResultModal(false); navigate({ to: "/programs" }); }} 
                className="absolute right-4 top-4 lg:right-8 lg:top-8 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full transition z-50 backdrop-blur-md border border-white/20"
              >
                <X className="size-6" />
              </button>

             <button 
               onClick={() => setActiveResultCard(prev => Math.max(0, prev - 1))}
               disabled={activeResultCard === 0}
               className="absolute left-2 lg:left-8 z-50 p-3 sm:p-5 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition disabled:opacity-20 border border-white/20 shadow-xl"
             >
               <ChevronLeft className="size-6 sm:size-8" />
             </button>

             <button 
               onClick={() => setActiveResultCard(prev => Math.min(examResult.details.length - 1, prev + 1))}
               disabled={activeResultCard === examResult.details.length - 1}
               className="absolute right-2 lg:right-8 z-50 p-3 sm:p-5 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition disabled:opacity-20 border border-white/20 shadow-xl"
             >
               <ChevronRight className="size-6 sm:size-8" />
             </button>

             <div className="w-full h-full max-w-5xl relative flex items-center justify-center">
                {examResult.details.map((d: any, index: number) => {
                   const isLeft = index < activeResultCard;
                   const isRight = index > activeResultCard;

                   let transform = "translateX(0%) scale(1)";
                   let opacity = "opacity-100";
                   let zIndex = "z-10";
                   let pointerEvents = "pointer-events-auto";

                   if (isLeft) {
                     transform = "translateX(-120%) scale(0.9)";
                     opacity = "opacity-0";
                     zIndex = "z-0";
                     pointerEvents = "pointer-events-none";
                   } else if (isRight) {
                     transform = "translateX(120%) scale(0.9)";
                     opacity = "opacity-0";
                     zIndex = "z-0";
                     pointerEvents = "pointer-events-none";
                   }

                   return (
                     <div 
                       key={index}
                       className={`absolute w-[95%] sm:w-[85%] lg:w-full h-[95%] lg:h-[85vh] bg-white rounded-3xl flex flex-col shadow-2xl transition-all duration-500 ease-in-out ${opacity} ${zIndex} ${pointerEvents}`}
                       style={{ transform }}
                     >
                        <div className={`p-5 sm:p-6 lg:p-8 shrink-0 flex flex-col gap-3 rounded-t-3xl ${d.isCorrect ? "bg-emerald-50 border-b border-emerald-100" : "bg-red-50 border-b border-red-100"}`}>
                           <div className="flex items-center justify-between">
                             <span className="bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                               ข้อ {index + 1} / {examResult.total}
                             </span>
                             {d.isCorrect ? (
                                <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm bg-emerald-200/50 px-4 py-1.5 rounded-full"><CheckCircle2 className="size-5" /> ถูกต้อง</span>
                             ) : (
                                <span className="flex items-center gap-1.5 text-rose-700 font-bold text-sm bg-rose-200/50 px-4 py-1.5 rounded-full"><XCircle className="size-5" /> ผิด</span>
                             )}
                           </div>
                           <p className="font-bold text-base sm:text-lg lg:text-xl text-slate-800 leading-relaxed whitespace-pre-line select-text">
                             <Latex>{String(d.question || "")}</Latex>
                           </p>
                        </div>

                        <div 
                          className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto custom-scrollbar relative bg-slate-50/50 space-y-6"
                        >
                           {questions[index]?.image_url && questions[index].image_url !== "NEEDS_IMAGE" && (
                             <div className="flex justify-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                               <img src={questions[index].image_url} alt="Question Graphic" className="max-h-64 object-contain rounded-xl select-none pointer-events-none" />
                             </div>
                           )}

                           {d.type === "choice" ? (
                             <div className="space-y-2.5">
                               <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ตัวเลือกทั้งหมด:</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 {d.options.map((opt: string, optIdx: number) => {
                                   const isCorrectChoice = optIdx === d.correct_index;
                                   const isUserChoice = d.userAnswer === optIdx;

                                   let choiceBoxStyle = "border-slate-200 bg-white text-slate-700 shadow-sm";
                                   let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

                                   if (isCorrectChoice) {
                                     choiceBoxStyle = "border-emerald-400 bg-emerald-50/90 text-emerald-950 font-bold ring-1 ring-emerald-400 shadow-sm";
                                     badgeStyle = "bg-emerald-600 text-white border-emerald-600";
                                   } else if (isUserChoice && !d.isCorrect) {
                                     choiceBoxStyle = "border-rose-400 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-400";
                                     badgeStyle = "bg-rose-600 text-white border-rose-600";
                                   }

                                   return (
                                     <div 
                                       key={optIdx}
                                       className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between gap-3 transition-all ${choiceBoxStyle}`}
                                     >
                                       <div className="flex items-center gap-3">
                                         <span className={`size-7 rounded-xl flex items-center justify-center text-xs font-black border shrink-0 ${badgeStyle}`}>
                                           {choiceLabels[optIdx] || optIdx + 1}
                                         </span>
                                         <span className="leading-relaxed"><Latex>{String(opt)}</Latex></span>
                                       </div>

                                       {isCorrectChoice && (
                                         <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
                                           ✓ เฉลยที่ถูก
                                         </span>
                                       )}
                                       {isUserChoice && !d.isCorrect && (
                                         <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded-md shrink-0">
                                           ✗ คำตอบของคุณ
                                         </span>
                                       )}
                                     </div>
                                   );
                                 })}
                               </div>
                             </div>
                           ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className={`p-5 rounded-2xl border shadow-sm ${d.isCorrect ? "bg-emerald-100/40 border-emerald-200 text-emerald-900" : "bg-red-100/40 border-red-200 text-red-900"}`}>
                                 <p className="text-xs font-bold mb-1 opacity-60 uppercase tracking-wider">คำตอบที่คุณเขียน:</p>
                                 <p className="font-bold leading-relaxed text-base"><Latex>{String(d.userAnswer || "ไม่ได้ตอบ")}</Latex></p>
                               </div>
                               <div className="p-5 rounded-2xl border shadow-sm bg-emerald-50 border-emerald-200 text-emerald-900">
                                 <p className="text-xs font-bold mb-1 opacity-60 uppercase tracking-wider">เฉลยที่ถูกต้อง:</p>
                                 <p className="font-bold leading-relaxed text-base"><Latex>{String(d.correctAnswer || "")}</Latex></p>
                               </div>
                             </div>
                           )}

                           {d.explanation && d.explanation !== "ไม่มีคำอธิบายเพิ่มเติม" && (
                             <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
                               <span className="font-bold flex items-center gap-2 text-primary mb-3 text-base">
                                 <Lightbulb className="size-5 text-amber-500" /> วิธีทำอย่างละเอียด:
                               </span>
                               <div className="whitespace-pre-line leading-loose text-slate-700 text-sm sm:text-base select-text">
                                 <Latex>{String(d.explanation || "")}</Latex>
                               </div>
                             </div>
                           )}
                        </div>
                     </div>
                   );
                })}
             </div>
             
             <div className="absolute bottom-2 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 bg-black/40 px-4 py-2.5 rounded-full backdrop-blur-md max-w-[80%] overflow-x-auto custom-scrollbar">
                {examResult.details.map((_: any, i: number) => (
                   <div 
                     key={i} 
                     onClick={() => setActiveResultCard(i)}
                     className={`h-2.5 rounded-full transition-all cursor-pointer shrink-0 ${i === activeResultCard ? "w-10 bg-white" : "w-2.5 bg-white/40 hover:bg-white/80"}`}
                   />
                ))}
             </div>

          </div>
        </div>
      )}

      {/* Modal: เกียรติบัตร */}
      {showCertModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-amber-600" />
                <span className="font-bold text-sm text-slate-800">เกียรติบัตรรับรองผลการสอบ</span>
              </div>
              <button onClick={() => setShowCertModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-full">
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
                  <span className="font-bold text-slate-800 text-sm sm:text-base">"{examData.title}"</span>
                </p>

                <div className="inline-flex items-center gap-6 my-6 bg-white/80 border border-amber-200/80 px-6 py-3 rounded-2xl shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">คะแนนที่ได้</p>
                    <p className="text-lg font-black text-emerald-600">{examResult.score} / {examResult.total}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">คิดเป็น</p>
                    <p className="text-lg font-black text-amber-600">{examResult.percentage}%</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  ให้ไว้ ณ วันที่ {new Date().toLocaleDateString("th-TH")} • Exam Vault Thailand
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
              <button 
                onClick={() => setShowCertModal(false)}
                className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
              >
                <Printer className="size-4" /> พิมพ์ / บันทึก PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}