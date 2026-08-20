import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { ChevronRight, FileText, Play, Timer, BookOpen, PenTool, Loader2, Eraser, Sparkles, Video, FilePenLine } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROGRAMS, YEARS, isProgramId } from "@/lib/exam-data";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from 'react-signature-canvas'; 

export const Route = createFileRoute("/hub/$program")({
  loader: ({ params }) => {
    if (!isProgramId(params.program)) throw notFound();
    return { program: PROGRAMS[params.program] };
  },
  component: ExamHub,
});

const DB_PROGRAM_MAP: Record<string, string> = {
  ep: "EP",
  ism: "ISM",
  regular: "ภาคปกติ",
};

// ==========================================
// 💡 คอมโพเนนต์ย่อย: กระดานฝึกเขียนอัจฉริยะ (AI ตรวจลายมือ)
// ==========================================
const SmartPracticeCanvas = ({ subject }: { subject: string }) => {
  const sigCanvas = useRef<any>(null); // แก้ไข type เป็น any เพื่อป้องกัน error
  const [result, setResult] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setResult("");
  };

  const handleCheckHandwriting = async () => {
    if (sigCanvas.current?.isEmpty()) return;
    setIsChecking(true);
    setResult("");

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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "ไม่สามารถอ่านได้";
      setResult(text);
    } catch (error) {
      setResult("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mt-4 p-5 bg-amber-50/50 rounded-2xl border border-amber-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-amber-900 flex items-center gap-2">
          <PenTool className="size-4 text-amber-600" /> สมุดจด/ฝึกเขียนคำศัพท์
        </h4>
        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-md font-medium">AI Handwriting</span>
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
          canvasProps={{ className: "w-full h-40 cursor-crosshair" }}
        />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleClear} variant="outline" className="flex-1 bg-white border-amber-300 text-amber-700 hover:bg-amber-100">
            <Eraser className="size-4 mr-2" /> ลบ
          </Button>
          <Button onClick={handleCheckHandwriting} disabled={isChecking} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold">
            {isChecking ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
            AI ตรวจลายมือ
          </Button>
        </div>
        
        <div className="flex-1 w-full bg-white p-2.5 rounded-lg border border-amber-200 min-h-[44px] flex items-center px-4">
          {isChecking ? (
            <span className="text-sm text-slate-400 animate-pulse">กำลังอ่านลายมือ...</span>
          ) : result ? (
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-2">
              สิ่งที่คุณเขียนคือ: <span className="text-lg text-emerald-700 font-black tracking-wider bg-emerald-50 px-2 py-0.5 rounded">{result}</span>
            </span>
          ) : (
            <span className="text-sm text-slate-400">ผลการอ่านลายมือจะแสดงที่นี่...</span>
          )}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 💡 คอมโพเนนต์หลัก: ExamHub (หน้านักเรียน)
// ==========================================
function ExamHub() {
  const { program } = Route.useLoaderData();
  
  // 💡 เพิ่มโหมด "worksheet" เข้ามาใหม่
  const [activeMode, setActiveMode] = useState<"study" | "worksheet" | "exam">("study");
  const [subject, setSubject] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  
  const [allPapers, setAllPapers] = useState<any[]>([]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [allWorksheets, setAllWorksheets] = useState<any[]>([]); // 💡 State เก็บข้อมูลชีท
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const dbProgram = DB_PROGRAM_MAP[program.id];
      
      // ดึงข้อมูลข้อสอบ
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .ilike('program', `%${dbProgram}%`)
        .eq('status', 'published');
      if (examsData) setAllPapers(examsData);

      // ดึงข้อมูลบทเรียน
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .ilike('program', `%${dbProgram}%`);
      if (lessonsData) setAllLessons(lessonsData);

      // 💡 ดึงข้อมูลชีทแบบฝึกหัด
      const { data: worksheetsData } = await supabase
        .from('worksheets')
        .select('*')
        .ilike('program', `%${dbProgram}%`);
      if (worksheetsData) setAllWorksheets(worksheetsData);

      setIsLoading(false);
    };
    
    fetchData();
  }, [program.id]);

  const papers = allPapers.filter(p => (subject === "all" || p.subject === subject) && (year === "all" || String(p.year) === year));
  const lessons = allLessons.filter(l => (subject === "all" || l.subject === subject));
  const worksheets = allWorksheets.filter(w => (subject === "all" || w.subject === subject));

  return (
    <PageShell>
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">ป.6</Link>
        <ChevronRight className="size-4" />
        <Link to="/programs" className="transition-colors hover:text-foreground">แผนการเรียน</Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">เตรียมตัวสอบ {program.name}</span>
      </nav>

      <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">ศูนย์การเรียนรู้ {program.name}</h1>
          <p className="mt-2 text-base text-muted-foreground">{program.fullName}</p>
        </div>

        {/* 💡 อัปเดตเมนูเป็น 3 โหมด */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto shadow-inner overflow-x-auto">
          <button 
            onClick={() => setActiveMode("study")}
            className={`shrink-0 md:w-32 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeMode === "study" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <BookOpen className="size-4" /> ห้องเรียน
          </button>
          
          <button 
            onClick={() => setActiveMode("worksheet")}
            className={`shrink-0 md:w-36 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeMode === "worksheet" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <FilePenLine className="size-4" /> แบบฝึกหัด
          </button>

          <button 
            onClick={() => setActiveMode("exam")}
            className={`shrink-0 md:w-32 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeMode === "exam" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <PenTool className="size-4" /> ห้องสอบ
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* ส่วนกรองวิชา (ใช้ร่วมกันทุกโหมด) */}
      {/* ================================================= */}
      <section className="mt-10 animate-in fade-in" aria-labelledby="subjects-heading">
        <h2 id="subjects-heading" className="text-lg font-bold text-slate-800">กรองวิชา</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {program.subjects.map((s) => {
            const active = subject === s;
            return (
              <button
                key={s} type="button" onClick={() => setSubject(active ? "all" : s)}
                className={`card-surface flex flex-col items-start gap-2 p-5 text-left transition-all rounded-2xl border-2 ${
                  active ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:border-slate-200"
                }`}
              >
                <BookOpen className={`size-6 ${active ? "text-primary" : "text-slate-400"}`} />
                <span className={`text-base font-bold ${active ? "text-primary" : "text-slate-700"}`}>{s}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================================================= */}
      {/* โหมด 1: ห้องเรียน (Lessons) */}
      {/* ================================================= */}
      {activeMode === "study" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">เนื้อหาบทเรียน</h2>
              <p className="text-sm text-muted-foreground mt-1">พบ {lessons.length} บทเรียนในหมวดหมู่นี้</p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-12 flex flex-col items-center text-slate-400">
              <Loader2 className="size-8 animate-spin mb-4 text-primary" />
              <p>กำลังโหลดเนื้อหา...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="card-surface p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none mb-2">{lesson.subject}</Badge>
                      <h3 className="text-xl font-bold text-slate-800 leading-tight">{lesson.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-6 flex-1">{lesson.description || "ไม่มีคำอธิบายเพิ่มเติม"}</p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    {lesson.video_url && (
                      <a href={lesson.video_url} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2.5 rounded-xl font-bold transition-colors">
                        <Video className="size-4" /> ดูวิดีโอเรียน
                      </a>
                    )}
                    {lesson.pdf_url && (
                      <a href={lesson.pdf_url} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold transition-colors">
                        <FileText className="size-4" /> เอกสารประกอบ
                      </a>
                    )}
                  </div>

                  <SmartPracticeCanvas subject={lesson.subject} />
                </div>
              ))}

              {lessons.length === 0 && (
                <div className="col-span-1 lg:col-span-2 card-surface p-16 text-center text-slate-400 border-dashed border-2 rounded-3xl">
                  <BookOpen className="size-12 mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium text-slate-500 mb-1">ยังไม่มีเนื้อหาบทเรียน</p>
                  <p className="text-sm">รอคุณครูอัปเดตเนื้อหาในระบบเพิ่มเติมนะครับ</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================= */}
      {/* 💡 โหมด 2: แบบฝึกหัด (Worksheets) */}
      {/* ================================================= */}
      {activeMode === "worksheet" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">ชีทแบบฝึกหัด (วาดเขียนออนไลน์)</h2>
              <p className="text-sm text-muted-foreground mt-1">พบ {worksheets.length} ชุดแบบฝึกหัดที่พร้อมให้ฝึกฝน</p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-12 flex flex-col items-center text-slate-400">
              <Loader2 className="size-8 animate-spin mb-4 text-emerald-600" />
              <p>กำลังโหลดแบบฝึกหัด...</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worksheets.map((ws) => (
                <li key={ws.id} className="card-surface flex flex-col justify-between p-6 rounded-2xl border border-slate-100 hover:border-emerald-500/30 transition-colors shadow-sm">
                  <div>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none mb-3">{ws.subject}</Badge>
                    <h3 className="text-lg font-bold text-slate-800">{ws.title}</h3>
                    <div className="mt-3 flex items-center gap-4 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md"><FileText className="size-4 text-slate-400" /> {ws.pages?.length || 0} หน้า</span>
                    </div>
                  </div>
                  <Button asChild className="mt-6 w-full rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-bold group">
                    <Link to="/worksheet/$id" params={{ id: String(ws.id) }}>
                      <FilePenLine className="size-4 mr-2 transition-transform group-hover:scale-110" /> ทำแบบฝึกหัด
                    </Link>
                  </Button>
                </li>
              ))}
              {worksheets.length === 0 && (
                <li className="col-span-1 md:col-span-2 card-surface p-12 text-center text-slate-400 border-dashed border-2 rounded-2xl">
                  ยังไม่มีชีทแบบฝึกหัดในระบบ หรือไม่พบข้อมูลตามตัวกรอง
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* ================================================= */}
      {/* โหมด 3: ห้องสอบ (Exams) */}
      {/* ================================================= */}
      {activeMode === "exam" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">คลังข้อสอบเก่า</h2>
              <p className="text-sm text-muted-foreground mt-1">พบ {papers.length} ชุดข้อสอบที่พร้อมให้ฝึกฝน</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-36 rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="ปีการศึกษา" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">ทุกปีการศึกษา</SelectItem>
                  {YEARS.map((y) => (<SelectItem key={y} value={String(y)}>ปี {y}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-12 flex flex-col items-center text-slate-400">
              <Loader2 className="size-8 animate-spin mb-4 text-rose-600" />
              <p>กำลังโหลดข้อสอบ...</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {papers.map((paper) => (
                <li key={paper.id} className="card-surface flex flex-col justify-between p-6 rounded-2xl border border-slate-100 hover:border-rose-500/30 transition-colors shadow-sm">
                  <div>
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none mb-3">ปี {paper.year}</Badge>
                    <h3 className="text-lg font-bold text-slate-800">{paper.title}</h3>
                    <div className="mt-3 flex items-center gap-4 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md"><FileText className="size-4 text-slate-400" /> {paper.total_questions} ข้อ</span>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md"><Timer className="size-4 text-slate-400" /> 90 นาที</span>
                    </div>
                  </div>
                  <Button asChild className="mt-6 w-full rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all font-bold group">
                    <Link to="/exam/$program/$subject/$year" params={{ program: program.id, subject: paper.subject, year: String(paper.year) }}>
                      <Play className="size-4 mr-2 transition-transform group-hover:scale-110" /> เริ่มทำข้อสอบ
                    </Link>
                  </Button>
                </li>
              ))}
              {papers.length === 0 && (
                <li className="col-span-1 md:col-span-2 card-surface p-12 text-center text-slate-400 border-dashed border-2 rounded-2xl">
                  ยังไม่มีชุดข้อสอบในระบบ หรือไม่พบข้อมูลตามตัวกรอง
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}