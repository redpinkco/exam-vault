import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Eraser, Sparkles, Loader2, CheckCircle2, FileText, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from 'react-signature-canvas';

export const Route = createFileRoute("/worksheet/$id")({
  component: WorksheetPage,
});

function WorksheetPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [worksheet, setWorksheet] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // สร้าง Array ของ Ref เพื่อเก็บลายเส้นแยกแต่ละหน้า
  const sigCanvasRefs = useRef<any[]>([]);
  
  const [isChecking, setIsChecking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>("");

  useEffect(() => {
    const fetchWorksheet = async () => {
      const { data, error } = await supabase.from('worksheets').select('*').eq('id', id).single();
      if (error || !data) {
        alert("ไม่พบข้อมูลแบบฝึกหัดนี้");
        navigate({ to: "/programs" });
        return;
      }
      setWorksheet(data);
      sigCanvasRefs.current = new Array(data.pages.length).fill(null);
    };
    fetchWorksheet();
  }, [id, navigate]);

  const handleClear = () => {
    const currentCanvas = sigCanvasRefs.current[currentPage];
    currentCanvas?.clear();
    setAiFeedback("");
  };

  const handleCheckWithAI = async () => {
    const currentCanvas = sigCanvasRefs.current[currentPage];
    
    if (!currentCanvas || currentCanvas.isEmpty()) {
      alert("กรุณาเขียนคำตอบลงบนแบบฝึกหัดก่อนส่งตรวจครับ");
      return;
    }

    setIsChecking(true);
    setAiFeedback("");

    try {
      // 1. ดึงภาพพื้นหลัง (ชีทแบบฝึกหัด)
      const bgImg = new Image();
      bgImg.crossOrigin = "Anonymous";
      bgImg.src = worksheet.pages[currentPage];

      await new Promise((resolve, reject) => {
        bgImg.onload = resolve;
        bgImg.onerror = reject;
      });

      // 2. สร้าง Canvas จำลองเพื่อรวมร่างรูป
      const mergeCanvas = document.createElement("canvas");
      mergeCanvas.width = bgImg.width;
      mergeCanvas.height = bgImg.height;
      const ctx = mergeCanvas.getContext("2d");

      if (!ctx) throw new Error("ไม่สามารถสร้าง Canvas ได้");

      // วาดรูปชีทลงไปก่อน
      ctx.drawImage(bgImg, 0, 0, mergeCanvas.width, mergeCanvas.height);

      // วาดลายเส้นของเด็กลงไปทับ
      const studentDrawing = currentCanvas.getCanvas();
      ctx.drawImage(studentDrawing, 0, 0, mergeCanvas.width, mergeCanvas.height);

      // 3. แปลงเป็น Base64
      const finalImageBase64 = mergeCanvas.toDataURL("image/jpeg", 0.8).split(",")[1];

      // 4. ส่งให้ Gemini ตรวจ
      // ✅ ดึงคีย์ผ่าน Environment Variable อย่างปลอดภัย
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if(!apiKey) {
        alert("กรุณาตั้งค่า API Key ในไฟล์ .env ก่อนใช้งาน AI ตรวจกระดาษคำตอบ");
        setIsChecking(false);
        return;
      }
      
      const prompt = `ทำหน้าที่เป็นคุณครูใจดี ตรวจแบบฝึกหัดในรูปภาพนี้ รูปนี้ประกอบด้วยโจทย์และลายมือเขียนคำตอบของนักเรียนซ้อนทับกันอยู่ 
      กรุณาอ่านลายมือและตรวจสอบความถูกต้องทีละข้อ (อิงจากโจทย์ในรูป) พร้อมสรุปคะแนนคร่าวๆ และให้คำแนะนำนักเรียนอย่างเป็นกันเองและให้กำลังใจ`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: finalImageBase64 } }] }]
        })
      });

      const data = await response.json();
      const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "เกิดข้อผิดพลาดในการประมวลผลคำตอบ";
      setAiFeedback(feedback);

    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการรวมภาพหรือเชื่อมต่อ AI");
    } finally {
      setIsChecking(false);
    }
  };

  if (!worksheet) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">กำลังโหลดแบบฝึกหัด...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()} 
            className="p-2 hover:bg-slate-700 rounded-full transition"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{worksheet.title}</h1>
            <p className="text-xs text-slate-400">หน้าที่ {currentPage + 1} จาก {worksheet.pages.length}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleClear} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition">
            <Eraser className="size-4" /> ล้างหน้าปัจจุบัน
          </button>
          <button onClick={handleCheckWithAI} disabled={isChecking} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition disabled:opacity-50">
            {isChecking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} ตรวจหน้านี้
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ฝั่งซ้าย: กระดาษชีท */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex justify-center items-start custom-scrollbar">
          {worksheet.pages.map((pageStr: string, idx: number) => (
            <div 
              key={idx} 
              className={`relative shadow-2xl bg-white w-full max-w-4xl transition-opacity duration-300 ${idx === currentPage ? "block" : "hidden"}`}
              style={{ aspectRatio: "1/1.414" }} // อัตราส่วนกระดาษ A4
            >
              {/* รูปชีทพื้นหลัง */}
              <img src={pageStr} alt={`Page ${idx + 1}`} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
              
              {/* กระดานใสๆ ให้เขียนทับ (Invisible Canvas) */}
              <div className="absolute inset-0 z-10 mix-blend-multiply opacity-80">
                {/* @ts-ignore */}
                <SignatureCanvas 
                  ref={(ref: any) => { sigCanvasRefs.current[idx] = ref; }}
                  penColor="#2563eb" // ปากกาสีน้ำเงิน
                  canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ฝั่งขวา: แผงควบคุมและ AI Feedback */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shadow-xl z-10">
          
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <button 
              onClick={() => { setCurrentPage(prev => Math.max(0, prev - 1)); setAiFeedback(""); }}
              disabled={currentPage === 0}
              className="p-2 bg-slate-700 rounded-lg text-white disabled:opacity-30 transition-colors"
            ><ChevronLeft className="size-5"/></button>
            <span className="text-white font-bold text-sm">เปลี่ยนหน้า</span>
            <button 
              onClick={() => { setCurrentPage(prev => Math.min(worksheet.pages.length - 1, prev + 1)); setAiFeedback(""); }}
              disabled={currentPage === worksheet.pages.length - 1}
              className="p-2 bg-slate-700 rounded-lg text-white disabled:opacity-30 transition-colors"
            ><ChevronRight className="size-5"/></button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <CheckCircle2 className="size-5" />
              <h3 className="font-bold">ผลการตรวจจาก AI</h3>
            </div>
            
            {isChecking ? (
              <div className="text-slate-400 text-sm animate-pulse flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="size-8 animate-spin text-emerald-500 mb-3" />
                กำลังรวบรวมลายมือของคุณ<br/>ส่งให้คุณครู AI ตรวจนะครับ...
              </div>
            ) : aiFeedback ? (
              <div className="bg-slate-700/50 p-4 rounded-xl text-slate-200 text-sm whitespace-pre-line leading-relaxed border border-slate-600 shadow-inner">
                {aiFeedback}
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                <FileText className="size-10 mx-auto mb-2 opacity-20" />
                ทำแบบฝึกหัดเสร็จแล้ว<br/>กดปุ่ม <b>"ตรวจหน้านี้"</b> ด้านบน<br/>เพื่อดูผลลัพธ์ได้เลยครับ
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}