import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { ChevronRight, FileText, Play, Timer, BookOpen, PenTool, Loader2, Eraser, Sparkles, Video, FilePenLine, ChevronLeft, Layers } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROGRAMS, isProgramId } from "@/lib/exam-data";
import { supabase } from "@/lib/supabase";
import SignatureCanvas from "react-signature-canvas";

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

// ฟังก์ชันจัดกลุ่มชื่อวิชาแบบตรงตัว ไม่ให้ 'คณิต' ไปทับกับ 'ความถนัดด้านคณิตศาสตร์'
const normalizeSubject = (name: string) => {
  const n = name.trim().toLowerCase();
  if (n === "คณิต" || n === "คณิตศาสตร์" || n === "math") return "คณิตศาสตร์";
  if (n === "วิทย์" || n === "วิทยาศาสตร์" || n === "science") return "วิทยาศาสตร์";
  if (n === "อังกฤษ" || n === "ภาษาอังกฤษ" || n === "english") return "ภาษาอังกฤษ";
  if (n === "ไทย" || n === "ภาษาไทย" || n === "thai") return "ภาษาไทย";
  if (n === "สังคม" || n === "สังคมศึกษา" || n === "social") return "สังคมศึกษา";
  return n;
};

const matchSubject = (dbSubject: string | undefined, selectedSubject: string) => {
  if (selectedSubject === "all") return true;
  if (!dbSubject) return false;
  return normalizeSubject(dbSubject) === normalizeSubject(selectedSubject);
};

const SmartPracticeCanvas = ({ subject }: { subject: string }) => {
  const sigCanvas = useRef<any>(null);
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
      const prompt = `อ่านลายมือในรูปภาพนี้ (อาจจะเป็นตัวเลข, ภาษาอังกฤษ หรือภาษาไทย) ตอบกลับมาเฉพาะคำหรือตัวเลขที่อ่านได้อย่างแม่นยำที่สุด ห้ามมีคำอธิบายเพิ่มเติม หากอ่านไม่ออกให้ตอบว่า '-'`;

      const response = await fetch(`/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }],
        }),
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
    <div className="mt-4 p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-amber-50/60 border border-amber-200/80 shadow-sm w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-amber-900 flex items-center gap-2 text-xs sm:text-sm">
          <PenTool className="size-4 text-amber-600" /> สมุดทดเลข / ฝึกเขียน ({subject})
        </h4>
        <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
          AI Powered
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden border-2 border-amber-200 bg-white relative shadow-inner"
        style={{
          backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #fef3c7 31px, #fef3c7 32px)",
          backgroundSize: "100% 32px",
          backgroundPosition: "0 8px",
        }}
      >
        {/* @ts-ignore */}
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1e3a8a"
          canvasProps={{ className: "w-full h-36 cursor-crosshair" }}
        />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-center gap-2.5">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleClear}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-amber-300 text-amber-800 bg-white/80 hover:bg-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Eraser className="size-3.5" /> ล้าง
          </button>
          <button
            onClick={handleCheckHandwriting}
            disabled={isChecking}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs transition disabled:opacity-50 shadow-[0_3px_0_0_#b45309] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5"
          >
            {isChecking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            AI อ่านลายมือ
          </button>
        </div>

        <div className="flex-1 w-full bg-white/90 p-2 rounded-2xl border border-amber-200/80 min-h-[40px] flex items-center px-3 shadow-inner">
          {isChecking ? (
            <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" /> กำลังอ่านลายมือ...
            </span>
          ) : result ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-2">
              ผลลัพธ์:
              <span className="text-xs sm:text-sm text-emerald-900 font-black bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                {result}
              </span>
            </span>
          ) : (
            <span className="text-xs text-slate-400">ผลการอ่านจะแสดงที่นี่...</span>
          )}
        </div>
      </div>
    </div>
  );
};

function ExamHub() {
  const { program } = Route.useLoaderData();
  const [activeMode, setActiveMode] = useState<"study" | "worksheet" | "exam">("exam");
  const [subject, setSubject] = useState<string>("all");
  const [year, setYear] = useState<string>("all");

  const [allPapers, setAllPapers] = useState<any[]>([]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [allWorksheets, setAllWorksheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const dbProgram = DB_PROGRAM_MAP[program.id];

      const { data: examsData } = await supabase
        .from("exams")
        .select("*")
        .ilike("program", `%${dbProgram}%`)
        .eq("status", "published");
      if (examsData) setAllPapers(examsData);

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .ilike("program", `%${dbProgram}%`);
      if (lessonsData) setAllLessons(lessonsData);

      const { data: worksheetsData } = await supabase
        .from("worksheets")
        .select("*")
        .ilike("program", `%${dbProgram}%`);
      if (worksheetsData) setAllWorksheets(worksheetsData);

      setIsLoading(false);
    };

    fetchData();
  }, [program.id]);

  const papers = allPapers.filter(
    (p) => matchSubject(p.subject, subject) && (year === "all" || String(p.year) === year)
  );
  const lessons = allLessons.filter((l) => matchSubject(l.subject, subject));
  const worksheets = allWorksheets.filter((w) => matchSubject(w.subject, subject));

  return (
    <PageShell>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-16">
        {/* Navigation Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-6">
          <Link to="/programs" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
            <ChevronLeft className="size-4" /> แผนการเรียน
          </Link>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="font-bold text-slate-800">ศูนย์สอบ {program.name}</span>
        </nav>

        {/* Header Title & Mode Selector */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 mb-2">
              <Layers className="size-3.5" /> ศูนย์การเรียนรู้ครบวงจร
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              ศูนย์สอบ {program.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">{program.fullName}</p>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto w-full lg:w-auto">
            <button
              onClick={() => setActiveMode("study")}
              className={`flex-1 lg:flex-initial shrink-0 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeMode === "study"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="size-4" /> ห้องเรียน
            </button>

            <button
              onClick={() => setActiveMode("worksheet")}
              className={`flex-1 lg:flex-initial shrink-0 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeMode === "worksheet"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FilePenLine className="size-4" /> แบบฝึกหัด
            </button>

            <button
              onClick={() => setActiveMode("exam")}
              className={`flex-1 lg:flex-initial shrink-0 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeMode === "exam"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <PenTool className="size-4" /> คลังข้อสอบ
            </button>
          </div>
        </div>

        {/* Subject Filter Grid */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">เลือกวิชาที่ต้องการฝึกฝน</h2>
            {subject !== "all" && (
              <button onClick={() => setSubject("all")} className="text-xs font-bold text-primary hover:underline">
                แสดงทุกวิชา
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setSubject("all")}
              className={`p-4 rounded-2xl border text-left transition-all backdrop-blur-md ${
                subject === "all"
                  ? "bg-primary text-white border-primary shadow-[0_4px_12px_rgba(15,118,110,0.25)] font-bold -translate-y-0.5"
                  : "bg-white/70 border-white/80 hover:bg-white text-slate-700 shadow-sm"
              }`}
            >
              <span className="text-[10px] opacity-70 block mb-1">ทั้งหมด</span>
              <span className="font-black text-sm">ทุกวิชา</span>
            </button>

            {program.subjects.map((s: string) => {
              const active = subject === s;
              return (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`p-4 rounded-2xl border text-left transition-all backdrop-blur-md ${
                    active
                      ? "bg-primary text-white border-primary shadow-[0_4px_12px_rgba(15,118,110,0.25)] font-bold -translate-y-0.5"
                      : "bg-white/70 border-white/80 hover:bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] opacity-70 block mb-1">รายวิชา</span>
                  <span className="font-black text-sm line-clamp-1">{s}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode 1: Study Classroom */}
        {activeMode === "study" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">เนื้อหาบทเรียน</h2>
                <p className="text-xs text-slate-500">พบ {lessons.length} บทเรียนในหมวดหมู่นี้</p>
              </div>
            </div>

            {isLoading ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">กำลังโหลดบทเรียน...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="backdrop-blur-xl bg-white/85 border border-white/90 p-6 sm:p-7 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold px-3 py-1 rounded-xl">
                          {lesson.subject}
                        </Badge>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-snug">{lesson.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{lesson.description || "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-wrap gap-2.5 mb-4">
                        {lesson.video_url && (
                          <a
                            href={lesson.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-rose-200/60 shadow-sm"
                          >
                            <Video className="size-4" /> ดูวิดีโอสอน
                          </a>
                        )}
                        {lesson.pdf_url && (
                          <a
                            href={lesson.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-blue-200/60 shadow-sm"
                          >
                            <FileText className="size-4" /> เอกสาร PDF
                          </a>
                        )}
                      </div>
                      <SmartPracticeCanvas subject={lesson.subject} />
                    </div>
                  </div>
                ))}

                {lessons.length === 0 && (
                  <div className="col-span-full backdrop-blur-md bg-white/40 border border-dashed border-slate-300 p-16 text-center text-slate-400 rounded-3xl">
                    <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-slate-600">ยังไม่มีเนื้อหาบทเรียนในหมวดนี้</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Worksheets */}
        {activeMode === "worksheet" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">ชีทแบบฝึกหัด</h2>
                <p className="text-xs text-slate-500">พบ {worksheets.length} ชุดแบบฝึกหัด</p>
              </div>
            </div>

            {isLoading ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-8 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold">กำลังโหลดแบบฝึกหัด...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {worksheets.map((ws) => (
                  <div
                    key={ws.id}
                    className="backdrop-blur-xl bg-white/85 border border-white/90 p-6 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col justify-between"
                  >
                    <div>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold px-3 py-1 rounded-xl mb-3">
                        {ws.subject}
                      </Badge>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 line-clamp-2">{ws.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <FileText className="size-3.5" /> ความยาว: {ws.pages?.length || 0} หน้า
                      </p>
                    </div>

                    <Link
                      to="/worksheet/$id"
                      params={{ id: String(ws.id) }}
                      className="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-[0_4px_0_0_#065f46] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      <FilePenLine className="size-4" /> เริ่มทำแบบฝึกหัด
                    </Link>
                  </div>
                ))}

                {worksheets.length === 0 && (
                  <div className="col-span-full backdrop-blur-md bg-white/40 border border-dashed border-slate-300 p-16 text-center text-slate-400 rounded-3xl">
                    <FilePenLine className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-slate-600">ยังไม่มีแบบฝึกหัดในหมวดนี้</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode 3: Exam Papers */}
        {activeMode === "exam" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">คลังข้อสอบเก่าเสมือนจริง</h2>
                <p className="text-xs text-slate-500">พบ {papers.length} ชุดข้อสอบพร้อมระบบจับเวลา</p>
              </div>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-40 rounded-2xl bg-white/80 border-slate-200 backdrop-blur-md font-bold text-xs">
                  <SelectValue placeholder="ปีการศึกษา" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">ทุกปีการศึกษา</SelectItem>
                  <SelectItem value="2566">ปีการศึกษา 2566</SelectItem>
                  <SelectItem value="2565">ปีการศึกษา 2565</SelectItem>
                  <SelectItem value="2564">ปีการศึกษา 2564</SelectItem>
                  <SelectItem value="2563">ปีการศึกษา 2563</SelectItem>
                  <SelectItem value="2562">ปีการศึกษา 2562</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">กำลังโหลดชุดข้อสอบ...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="backdrop-blur-xl bg-white/85 border border-white/90 p-6 sm:p-7 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                          ปี {paper.year}
                        </span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                          วิชา {paper.subject}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-800 mt-2 line-clamp-2">{paper.title}</h3>

                      <div className="mt-4 flex items-center gap-3 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <FileText className="size-3.5 text-slate-400" /> {paper.total_questions || paper.questions?.length || 0} ข้อ
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <Timer className="size-3.5 text-slate-400" /> {paper.is_timed === false ? "ไม่จับเวลา" : `${paper.duration_minutes || 90} นาที`}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/exam/$program/$subject/$year"
                      params={{ program: program.id, subject: paper.subject, year: String(paper.year) }}
                      className="mt-6 w-full py-3.5 bg-gradient-to-r from-teal-600 to-primary text-white font-bold rounded-2xl shadow-[0_4px_0_0_#0f766e] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      <Play className="size-4 fill-white" /> เริ่มทำข้อสอบชุดนี้
                    </Link>
                  </div>
                ))}

                {papers.length === 0 && (
                  <div className="col-span-full backdrop-blur-md bg-white/40 border border-dashed border-slate-300 p-16 text-center text-slate-400 rounded-3xl">
                    <FileText className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-slate-600">ไม่พบชุดข้อสอบตามเงื่อนไขที่เลือก</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}