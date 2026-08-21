import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, X, Award, Lightbulb, 
  Check, XCircle, FileSearch, Eraser, Sparkles, Loader2, PenTool, 
  TrendingUp, BarChart2, Timer, Bookmark, BotMessageSquare, Send
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from 'react-signature-canvas';

export const Route = createFileRoute("/exam/$program/$subject/$year")({
  component: ExamSessionPage,
});

const DB_PROGRAM_MAP: Record<string, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
};

// ==========================================
// 💡 คอมโพเนนต์ย่อย: AI Tutor สำหรับถามตอบเพิ่มเติม
// ==========================================
const AITutorChat = ({ questionData, userAnswer, correctAnswer }: { questionData: any, userAnswer: string, correctAnswer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: "user" | "ai", text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleAskAI = async () => {
    if (!input.trim()) return;
    
    const newMsg = { role: "user" as const, text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // ✅ ดึงคีย์ผ่าน Environment Variable อย่างปลอดภัย
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if(!apiKey) {
        setMessages(prev => [...prev, { role: "ai", text: "คุณครู AI ยังไม่พร้อมทำงาน กรุณาตั้งค่า API Key ในไฟล์ .env ก่อนนะครับ" }]);
        setIsTyping(false);
        return;
      }

      const contextPrompt = `คุณคือ "ครูผู้ช่วย AI ประจำคลังสอบ" หน้าที่ของคุณคืออธิบายวิธีคิดให้เด็กนักเรียนอย่างใจดี เป็นกันเอง และเข้าใจง่าย
      
      ข้อมูลโจทย์ข้อนี้:
      โจทย์: ${questionData.question}
      ตัวเลือกที่มี: ${(questionData.options || []).join(", ")}
      คำตอบที่นักเรียนตอบมา: ${userAnswer || "ไม่ได้ตอบ"}
      คำตอบที่ถูกต้องคือ: ${correctAnswer}
      เฉลยเดิมที่มีในระบบ: ${questionData.explanation || "ไม่มี"}
      
      คำถามจากนักเรียน: ${newMsg.text}
      
      กรุณาตอบคำถามนักเรียนโดยใช้ภาษาที่อ่านง่าย ไม่วิชาการเกินไป และให้กำลังใจนักเรียนด้วย`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }]
        })
      });

      const data = await response.json();
      const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "ขออภัยครับ ครู AI กำลังมึนงงเล็กน้อย ลองถามใหม่อีกครั้งนะครับ";
      
      setMessages(prev => [...prev, { role: "ai", text: aiResponseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", text: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ ลองใหม่อีกครั้งนะครับ" }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-3 w-full py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition shadow-sm"
      >
        <BotMessageSquare className="size-4" /> ถาม AI อธิบายข้อนี้ให้ฟังเพิ่มเติม
      </button>
    );
  }

  return (
    <div className="mt-4 border border-indigo-200 bg-indigo-50/30 rounded-xl overflow-hidden shadow-inner">
      <div className="bg-indigo-100 p-3 flex justify-between items-center border-b border-indigo-200">
        <span className="font-bold text-indigo-800 text-xs flex items-center gap-1.5"><Sparkles className="size-4" /> ครูผู้ช่วย AI (Tutor Mode)</span>
        <button onClick={() => setIsOpen(false)} className="text-indigo-500 hover:text-indigo-800"><X className="size-4" /></button>
      </div>
      
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
        <div className="bg-white border border-indigo-100 p-3 rounded-xl rounded-tl-none text-xs text-slate-700 inline-block max-w-[90%] shadow-sm">
          สวัสดีครับ! มีจุดไหนของข้อนี้ที่อ่านเฉลยแล้วยังไม่เข้าใจ พิมพ์ถามครูได้เลยครับ 👇
        </div>
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-3 rounded-xl text-xs max-w-[90%] shadow-sm ${m.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-white border border-indigo-100 text-slate-700 rounded-tl-none"}`}>
              <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="bg-white border border-indigo-100 p-3 rounded-xl rounded-tl-none text-xs text-slate-500 w-fit shadow-sm flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" /> ครูกำลังพิมพ์คำอธิบาย...
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
          placeholder="พิมพ์คำถามของคุณที่นี่..."
          className="flex-1 p-2.5 rounded-lg border bg-slate-50 text-xs outline-none focus:border-indigo-400"
        />
        <button 
          onClick={handleAskAI}
          disabled={!input.trim() || isTyping}
          className="p-2.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition shadow-sm"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 💡 คอมโพเนนต์ย่อย: กระดานเขียนคำตอบข้อสอบอัตนัย
// ==========================================
const SubjectiveCanvas = ({ answer, onUpdate }: { answer: string; onUpdate: (val: string) => void }) => {
  const sigCanvas = useRef<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleClear = () => {
    sigCanvas.current?.clear();
    onUpdate("");
  };

  const handleCheckHandwriting = async () => {
    if (sigCanvas.current?.isEmpty()) return;
    setIsChecking(true);

    try {
      const imageBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/jpeg", 0.9).split(",")[1];
      
      // ✅ ดึงคีย์ผ่าน Environment Variable อย่างปลอดภัย
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if(!apiKey) {
        alert("กรุณาตั้งค่า API Key ในไฟล์ .env ก่อนใช้งาน AI ตรวจลายมือ");
        setIsChecking(false);
        return;
      }

      const prompt = `อ่านลายมือในรูปภาพนี้ (อาจจะเป็นตัวเลข, ภาษาอังกฤษ หรือภาษาไทย) ตอบกลับมาเฉพาะคำหรือตัวเลขที่อ่านได้อย่างแม่นยำที่สุด ห้ามมีคำอธิบายเพิ่มเติม หากอ่านไม่ออกให้ตอบว่า '-'`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      
      if (text !== "-") {
        onUpdate(text);
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("ไม่สามารถเชื่อมต่อระบบอ่านลายมือได้ กรุณาพิมพ์คำตอบลงในช่องแทน");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <PenTool className="size-4 text-amber-600" /> พื้นที่ทดเลข / เขียนคำตอบ
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
            <Eraser className="size-4" /> ลบกระดาน
          </button>
          <button 
            onClick={handleCheckHandwriting} 
            disabled={isChecking} 
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center gap-2 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {isChecking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            ดึงคำตอบลงช่อง
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
          คำตอบที่ระบบบันทึก (สามารถใช้นิ้วพิมพ์แก้ไขได้ หาก AI อ่านผิด)
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="กดปุ่ม 'ดึงคำตอบลงช่อง' หรือพิมพ์ข้อความที่นี่..."
          className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none text-base font-bold transition-all text-primary"
        />
      </div>
    </div>
  );
};

// ==========================================
// 💡 คอมโพเนนต์หลัก: ExamSessionPage
// ==========================================
function ExamSessionPage() {
  const { program, subject, year } = Route.useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  
  const [bookmarkedIndexes, setBookmarkedIndexes] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(5400);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);

  const [statsData, setStatsData] = useState<{
    percentile: number;
    avgScore: number;
    maxScore: number;
    totalTakers: number;
    rankText: string;
  } | null>(null);

  useEffect(() => {
    fetchSessionAndExam();
  }, []);

  useEffect(() => {
    if (!examData || isSubmitted || isSubmitting || examData.is_timed === false) return;

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

  const fetchSessionAndExam = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("กรุณาเข้าสู่ระบบก่อนทำข้อสอบ");
      navigate({ to: "/login" });
      return;
    }

    const { data: studentData } = await supabase.from('students').select('*').eq('email', session.user.email).maybeSingle();
    
    const currentStudent = studentData || { 
      id: session.user.id, 
      name: session.user.user_metadata?.['name'] || session.user.email?.split('@')[0] || "นักเรียน",
      email: session.user.email, 
      examHistory: [], 
      mistakeBank: [],
      scores: {} 
    };
    setStudent(currentStudent);

    const decodedProgram = decodeURIComponent(program).toLowerCase();
    const decodedSubject = decodeURIComponent(subject);
    const dbProgramTarget = DB_PROGRAM_MAP[decodedProgram] || decodedProgram;

    const { data: examList, error } = await supabase
      .from('exams')
      .select('*')
      .ilike('subject', `%${decodedSubject}%`)
      .eq('year', year)
      .ilike('program', `%${dbProgramTarget}%`)
      .eq('status', 'published')
      .limit(1);

    if (error || !examList || examList.length === 0) {
      alert("คุณไม่มีสิทธิ์ หรือไม่พบข้อสอบในแผนการเรียนนี้");
      navigate({ to: "/" });
      return;
    }

    setExamData(examList[0]);
    if (examList[0].duration_minutes && examList[0].is_timed !== false) {
      setTimeLeft(Number(examList[0].duration_minutes) * 60);
    }
  };

  if (!examData || !student) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium bg-slate-50"><Loader2 className="size-6 animate-spin mr-2 text-primary" /> กำลังเตรียมข้อสอบ...</div>;
  }

  const questions = examData.questions || [];
  const currentQ = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).filter(k => userAnswers[k as unknown as number] !== undefined && userAnswers[k as unknown as number] !== "").length;

  const toggleBookmark = (idx: number) => {
    setBookmarkedIndexes(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
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
          isCorrect,
          userAnswer: uAns,
          correctAnswer: q.type === "choice" ? q.options[q.correct_index] : (q.subjective_answers || []).join(" หรือ "),
          explanation: q.explanation || "ไม่มีคำอธิบายเพิ่มเติม"
        };
      });

      const total = questions.length;
      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      const resultPayload = { score, total, percentage, details };

      setExamResult(resultPayload);
      setIsSubmitted(true);

      // บันทึกคะแนนลงในฐานข้อมูล
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

      // คำนวณสถิติ
      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('score, total, percentage')
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

      // อัปเดตประวัติของนักเรียน
      const currentHistory = Array.isArray(student.examHistory) ? student.examHistory : [];
      const newHistoryRecord = {
        id: Date.now(),
        exam_id: examData.id,
        title: examData.title,
        subject: examData.subject,
        year: examData.year,
        program: decodeURIComponent(program),
        score: score,
        total: total,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        timeSpent: "เสร็จสิ้น"
      };

      const updatedHistory = [...currentHistory, newHistoryRecord];

      // บันทึกข้อที่ผิดลงใน Mistake Bank
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
          explanation: d.explanation,
          question_data: questions[d.qIndex]
        }));

      const prevMistakes = Array.isArray(student.mistakeBank) ? student.mistakeBank : [];
      const updatedMistakes = [...prevMistakes, ...wrongQuestions];

      const currentScores = student.scores || { math: 0, english: 0, science: 0, thai: 0, social: 0 };
      let subjectKey = "other";
      if (examData.subject.includes("คณิต")) subjectKey = "math";
      else if (examData.subject.includes("วิทย์")) subjectKey = "science";
      else if (examData.subject.includes("อังกฤษ")) subjectKey = "english";
      else if (examData.subject.includes("ไทย")) subjectKey = "thai";
      else if (examData.subject.includes("สังคม")) subjectKey = "social";

      const updatedScores = { ...currentScores, [subjectKey]: percentage };

      if (typeof student.id === 'number') {
        await supabase.from("students").update({
          examHistory: updatedHistory,
          mistakeBank: updatedMistakes,
          scores: updatedScores
        }).eq("id", student.id);
      }

      setShowResultModal(true); 

    } catch (error) {
      console.error("Error saving exam:", error);
      alert("มีข้อผิดพลาดในการบันทึกคะแนน แต่คุณสามารถดูเฉลยได้");
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
              if (answeredCount > 0 && !isSubmitted) {
                if (!confirm("คุณกำลังทำข้อสอบค้างอยู่ คำตอบที่ทำไว้จะไม่ถูกบันทึก\n\nต้องการออกจากห้องสอบใช่หรือไม่?")) {
                  return;
                }
              }
              navigate({ to: "/hub/$program", params: { program } });
            }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition flex items-center gap-1 border border-slate-200"
            title="ออกจากห้องสอบ"
          >
            <ChevronLeft className="size-5" />
            <span className="text-xs font-bold hidden sm:inline">ออก</span>
          </button>

          <div>
            <h2 className="font-bold text-lg text-slate-800 line-clamp-1">{examData.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">ตอบแล้ว {answeredCount} / {questions.length} ข้อ • ปักหมุด {bookmarkedIndexes.length} ข้อ</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          {!isSubmitted && examData.is_timed !== false && (
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono font-bold text-sm transition-colors ${
              isTimeCritical ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-50 text-slate-700 border-slate-200"
            }`}>
              <Timer className={`size-4 ${isTimeCritical ? "text-red-500" : "text-slate-500"}`} />
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

            <p className="text-lg font-semibold text-slate-800 leading-relaxed mb-6 whitespace-pre-line">{currentQ?.question}</p>

            {currentQ?.image_url && (
              <div className="mb-6 flex justify-center">
                <img src={currentQ.image_url} alt="Question Graphic" className="max-h-64 object-contain rounded-xl border p-2 bg-slate-50" />
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
                      className={`p-4 rounded-xl border text-left text-sm font-medium transition flex items-center gap-3 ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary font-bold shadow-sm" 
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`size-6 shrink-0 rounded-full flex items-center justify-center text-xs border ${isSelected ? "bg-primary text-white border-primary" : "border-slate-300"}`}>
                        {choiceLabels[optIdx] || optIdx + 1}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
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

          <div className="flex items-center justify-between pt-6 border-t mt-8">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 text-sm border rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 flex items-center gap-1.5 font-medium transition"
            >
              <ChevronLeft className="size-4" /> ก่อนหน้า
            </button>

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

        {/* แผงผังข้อสอบ Navigation Palette */}
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="font-bold text-sm text-slate-800">แผงผังข้อสอบ</h3>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-primary"></div> ตอบแล้ว</span>
              <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-amber-400"></div> ปักหมุด</span>
              <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-slate-200"></div> ยังไม่ตอบ</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {questions.map((_: any, idx: number) => {
              const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== "";
              const isCurrent = currentIdx === idx;
              const isBookmarked = bookmarkedIndexes.includes(idx);

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all relative ${
                    isCurrent 
                      ? "ring-2 ring-primary ring-offset-2 bg-primary text-white shadow-sm" 
                      : isBookmarked
                        ? "bg-amber-100 text-amber-800 border-2 border-amber-400"
                        : isAnswered 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                  {isBookmarked && (
                    <Bookmark className="size-2.5 absolute top-1 right-1 fill-amber-500 text-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP RESULT พร้อมสถิติ Percentile และ AI Tutor */}
      {showResultModal && examResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            
            <div className="text-center pb-6 border-b border-slate-100 relative shrink-0">
              <button onClick={() => setShowResultModal(false)} className="absolute right-0 top-0 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X className="size-5"/></button>
              <Award className="size-14 text-amber-500 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-slate-800">สรุปผลการทดสอบ</h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{examData.title}</p>
              
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 px-6 py-3 rounded-2xl shadow-sm">
                  <span className="text-4xl font-extrabold text-amber-600">{examResult.score}</span>
                  <span className="text-lg font-medium text-amber-600/50">/</span>
                  <span className="text-xl font-bold text-amber-700">{examResult.total}</span>
                  <span className="ml-2 text-sm font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-lg">({examResult.percentage}%)</span>
                </div>

                {statsData && (
                  <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-3 rounded-2xl shadow-sm text-left">
                    <TrendingUp className="size-6 text-indigo-600" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Percentile Rank</p>
                      <p className="text-sm font-black text-indigo-900">ชนะผู้สอบ {statsData.percentile}%</p>
                    </div>
                  </div>
                )}
              </div>

              {statsData && (
                <div className="mt-4 max-w-xl mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                    <span className="flex items-center gap-1.5"><BarChart2 className="size-4 text-primary" /> เปรียบเทียบคะแนนเฉลี่ย</span>
                    <span className="text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md font-semibold">{statsData.rankText}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-white p-2 rounded-xl border">
                      <p className="text-slate-400 text-[10px]">ผู้ทำข้อสอบชุดนี้</p>
                      <p className="font-bold text-slate-700">{statsData.totalTakers} คน</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border">
                      <p className="text-slate-400 text-[10px]">คะแนนเฉลี่ยระบบ</p>
                      <p className="font-bold text-slate-700">{statsData.avgScore}%</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border">
                      <p className="text-slate-400 text-[10px]">คะแนนสูงสุด</p>
                      <p className="font-bold text-emerald-600">{statsData.maxScore}%</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>คะแนนของคุณ:</span>
                      <span className="font-bold text-primary">{examResult.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, examResult.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* รายละเอียดข้อถูก-ผิด + เฉลย + 💡 AI Tutor */}
            <div className="flex-1 overflow-y-auto space-y-5 my-6 pr-2 custom-scrollbar">
              {examResult.details.map((d: any, index: number) => (
                <div key={index} className={`p-5 sm:p-6 rounded-2xl border ${d.isCorrect ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-sm sm:text-base text-slate-800 leading-relaxed">
                      ข้อ {index + 1}. {d.question}
                    </p>
                    <div className="shrink-0 mt-0.5">
                      {d.isCorrect ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs sm:text-sm bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200"><CheckCircle2 className="size-4" /> ถูกต้อง</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-700 font-bold text-xs sm:text-sm bg-red-100 px-3 py-1.5 rounded-xl border border-red-200"><XCircle className="size-4" /> ผิด</span>
                      )}
                    </div>
                  </div>

                  {questions[index].image_url && (
                    <div className="mt-4 mb-2 flex justify-start">
                      <img src={questions[index].image_url} alt="Question Graphic" className="max-h-40 object-contain rounded-lg border bg-white p-1" />
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className={`p-3.5 rounded-xl border ${d.isCorrect ? "bg-emerald-100/50 border-emerald-200 text-emerald-900" : "bg-red-100/50 border-red-200 text-red-900"}`}>
                      <p className="text-[11px] font-semibold mb-1.5 opacity-70">คำตอบที่คุณเลือก:</p>
                      <p className="font-bold">{d.userAnswer !== undefined && d.userAnswer !== "" ? 
                        (questions[index].type === "choice" ? questions[index].options[d.userAnswer] : d.userAnswer) 
                        : "ไม่ได้ตอบ"}</p>
                    </div>
                    {!d.isCorrect && (
                      <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900">
                        <p className="text-[11px] font-semibold mb-1.5 opacity-70">เฉลยคำตอบที่ถูกต้อง:</p>
                        <p className="font-bold">{d.correctAnswer}</p>
                      </div>
                    )}
                  </div>

                  {d.explanation && d.explanation !== "ไม่มีคำอธิบายเพิ่มเติม" && (
                    <div className="mt-4 p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700">
                      <span className="font-bold flex items-center gap-1.5 text-amber-600 mb-2.5">
                        <Lightbulb className="size-4" /> คำอธิบายและวิธีทำอย่างละเอียด:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed text-slate-600 sm:pl-5">{d.explanation}</p>
                    </div>
                  )}

                  {/* 💡 คอมโพเนนต์ AI Tutor แบบฝังรายข้อ */}
                  <AITutorChat 
                    questionData={questions[index]} 
                    userAnswer={d.userAnswer !== undefined && d.userAnswer !== "" ? (questions[index].type === "choice" ? questions[index].options[d.userAnswer] : d.userAnswer) : "ไม่ได้ตอบ"} 
                    correctAnswer={d.correctAnswer} 
                  />

                </div>
              ))}
            </div>

            <div className="pt-2 shrink-0">
              <button 
                onClick={() => {
                  setShowResultModal(false);
                  navigate({ to: "/programs" });
                }}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition shadow-md text-base"
              >
                เสร็จสิ้น และกลับสู่หน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}