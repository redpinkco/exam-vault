import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, X, Award, Lightbulb, Check, XCircle, FileSearch, Eraser, Sparkles, Loader2, PenTool } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from 'react-signature-canvas'; // 💡 นำเข้ากระดานวาดรูป

export const Route = createFileRoute("/exam/$program/$subject/$year")({
  component: ExamSessionPage,
});

// 💡 เพิ่ม Mapping แปลง URL (ตัวเล็ก) เป็นชื่อใน Database
const DB_PROGRAM_MAP: Record<string, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
};

// ==========================================
// 💡 คอมโพเนนต์ย่อย: กระดานเขียนคำตอบข้อสอบอัตนัย
// ==========================================
const SubjectiveCanvas = ({ answer, onUpdate }: { answer: string; onUpdate: (val: string) => void }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
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
      const apiKey = "AQ.Ab8RN6LyaWE8FG3kCDnfyGsKsiDEoSVaTT3m0TMnClGY5-Vyow"; 
      
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
      {/* 1. กระดานวาดรูป */}
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

      {/* 2. ช่องแสดงข้อความ (พิมพ์แก้ได้) */}
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
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);

  useEffect(() => {
    fetchSessionAndExam();
  }, []);

  const fetchSessionAndExam = async () => {
    // 1. เช็ค Login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("กรุณาเข้าสู่ระบบก่อนทำข้อสอบ");
      navigate({ to: "/login" });
      return;
    }

    // 2. ดึงข้อมูลนักเรียน
    const { data: studentData } = await supabase.from('students').select('*').eq('email', session.user.email).single();
    if (!studentData) {
      alert("ไม่พบข้อมูลนักเรียนในระบบ");
      navigate({ to: "/login" });
      return;
    }
    setStudent(studentData);

    // 3. ดึงข้อมูลข้อสอบ
    const decodedProgram = decodeURIComponent(program).toLowerCase();
    const decodedSubject = decodeURIComponent(subject);
    
    // 💡 แปลง program จาก URL เป็นคำที่ใช้หาใน DB (เช่น ism -> ISM)
    const dbProgramTarget = DB_PROGRAM_MAP[decodedProgram] || decodedProgram;

    // 💡 ค้นหาแบบ .ilike เพื่อรองรับข้อมูลแบบ "ISM, EP"
    const { data: examList, error } = await supabase
      .from('exams')
      .select('*')
      .eq('subject', decodedSubject)
      .eq('year', year)
      .ilike('program', `%${dbProgramTarget}%`)
      .eq('status', 'published')
      .limit(1); // ดึงมาแค่ 1 ชุดก็พอ

    if (error || !examList || examList.length === 0) {
      alert("คุณไม่มีสิทธิ์ หรือไม่พบข้อสอบในแผนการเรียนนี้");
      navigate({ to: "/" });
      return;
    }

    // ถ้าเจอข้อสอบให้ Set State เลย
    setExamData(examList[0]);
  };

  if (!examData || !student) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">กำลังเตรียมข้อสอบ...</div>;
  }

  const questions = examData.questions || [];
  const currentQ = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).filter(k => userAnswers[k as unknown as number] !== undefined && userAnswers[k as unknown as number] !== "").length;

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
      const percentage = Math.round((score / total) * 100);
      const resultPayload = { score, total, percentage, details };

      setExamResult(resultPayload);
      setIsSubmitted(true);

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

      const currentScores = student.scores || { math: 0, english: 0, science: 0, thai: 0, social: 0 };
      let subjectKey = "other";
      if (examData.subject.includes("คณิต")) subjectKey = "math";
      else if (examData.subject.includes("วิทย์")) subjectKey = "science";
      else if (examData.subject.includes("อังกฤษ")) subjectKey = "english";
      else if (examData.subject.includes("ไทย")) subjectKey = "thai";
      else if (examData.subject.includes("สังคม")) subjectKey = "social";

      const updatedScores = { ...currentScores, [subjectKey]: percentage };

      await supabase.from("students").update({
        examHistory: updatedHistory,
        scores: updatedScores
      }).eq("id", student.id);

      setShowResultModal(true); 

    } catch (error) {
      console.error("Error saving exam:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกคะแนน แต่คุณยังสามารถดูเฉลยได้");
      setShowResultModal(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Header Bar */}
      <header className="w-full max-w-5xl bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg text-slate-800 line-clamp-1">{examData.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">ตอบแล้ว {answeredCount} / {questions.length} ข้อ</p>
        </div>
        <div>
          {isSubmitted ? (
            <button 
              onClick={() => setShowResultModal(true)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition text-sm"
            >
              <Lightbulb className="size-4" /> ดูข้อถูก-ผิด
            </button>
          ) : (
            <button 
              onClick={() => {
                if (answeredCount < questions.length) {
                  if(!confirm(`คุณยังทำข้อสอบไม่ครบ (ทำไป ${answeredCount}/${questions.length} ข้อ)\n\nยืนยันที่จะ "ส่งข้อสอบ" เพื่อดูเฉลยเลยหรือไม่?`)) return;
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
      </header>

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ฝั่งซ้าย: พื้นที่แสดงข้อสอบ */}
        <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold bg-primary/10 text-primary px-3.5 py-1.5 rounded-full">
                ข้อที่ {currentIdx + 1}
              </span>
              <span className="text-xs font-semibold text-slate-500 px-3 py-1 border rounded-lg bg-slate-50">
                {currentQ?.type === "subjective" ? "อัตนัย (เขียนตอบ)" : "ปรนัย (ตัวเลือก)"}
              </span>
            </div>

            <p className="text-lg font-semibold text-slate-800 leading-relaxed mb-6 whitespace-pre-line">{currentQ?.question}</p>

            {currentQ?.image_url && (
              <div className="mb-6 flex justify-center">
                <img src={currentQ.image_url} alt="Question Graphic" className="max-h-64 object-contain rounded-xl border p-2 bg-slate-50" />
              </div>
            )}

            {/* ตัวเลือกปรนัย */}
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
              /* 💡 ใช้งานกระดานเขียนคำตอบแทน <input> ธรรมดา */
              <SubjectiveCanvas 
                key={currentIdx} // บังคับให้รีเซ็ตกระดานใหม่เมื่อเปลี่ยนข้อ
                answer={userAnswers[currentIdx] || ""} 
                onUpdate={handleSubjectiveInput} 
              />
            )}
          </div>

          {/* Navigation Footers */}
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

        {/* ฝั่งขวา: แผงผังข้อสอบ Navigation Palette */}
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="font-bold text-sm text-slate-800">แผงผังข้อสอบ</h3>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-primary"></div> ตอบแล้ว</span>
              <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-slate-200"></div> ยังไม่ตอบ</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {questions.map((_: any, idx: number) => {
              const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== "";
              const isCurrent = currentIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    isCurrent 
                      ? "ring-2 ring-primary ring-offset-2 bg-primary text-white shadow-sm" 
                      : isAnswered 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP RESULT & เฉลยละเอียด */}
      {showResultModal && examResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            {/* สรุปคะแนน */}
            <div className="text-center pb-6 border-b border-slate-100 relative shrink-0">
              <button onClick={() => setShowResultModal(false)} className="absolute right-0 top-0 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X className="size-5"/></button>
              <Award className="size-16 text-amber-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-slate-800">สรุปผลการทดสอบ</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">{examData.title}</p>
              <div className="mt-5 inline-flex items-center justify-center gap-3 bg-amber-50 border border-amber-200 px-8 py-4 rounded-2xl shadow-sm">
                <span className="text-5xl font-extrabold text-amber-600">{examResult.score}</span>
                <span className="text-xl font-medium text-amber-600/50">/</span>
                <span className="text-2xl font-bold text-amber-700">{examResult.total}</span>
              </div>
            </div>

            {/* รายละเอียดข้อถูก-ผิด + เฉลย */}
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

                  {/* แสดงรูปภาพโจทย์ในเฉลย (ถ้ามี) */}
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

                  {/* กล่องเฉลยวิธีทำ (ถ้า AI ใส่ไว้) */}
                  {d.explanation && d.explanation !== "ไม่มีคำอธิบายเพิ่มเติม" && (
                    <div className="mt-4 p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700">
                      <span className="font-bold flex items-center gap-1.5 text-amber-600 mb-2.5">
                        <Lightbulb className="size-4" /> คำอธิบายและวิธีทำอย่างละเอียด:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed text-slate-600 sm:pl-5">{d.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ปุ่มปิด */}
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