import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, BookOpen, Users, PlusCircle, Edit, 
  Trash2, UploadCloud, FileText, X, BarChart3, Mail, Lock, Save, History, 
  Image as ImageIcon, Sparkles, ChevronLeft, Filter, Unlock, LogOut,
  GraduationCap, Video, CheckCircle2, Plus, AlignLeft, CheckSquare,
  Lightbulb, AlertTriangle, FilePenLine, Loader2, RefreshCw, 
  AlertOctagon, Download, Copy, Key, Shuffle, FileDown, FileSpreadsheet, Search,
  RotateCcw, ShieldAlert, PieChart, TrendingDown, Timer, Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import imageCompression from "browser-image-compression";
import Papa from "papaparse";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

const ADMIN_EMAILS = [
  "ttanasak@gmail.com"
];

const defaultPermissions = { "ป.4": false, "ป.5": false, "ป.6": true, "ISM": true, "EP": false, "ภาคปกติ": false };

interface QuestionItem {
  id: number;
  type: "choice" | "subjective"; 
  question: string;
  image_url?: string;
  options: string[];             
  correct_index?: number;        
  subjective_answers?: string[]; 
  explanation?: string;          
}

const safeGetArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

function AdminDashboard() {
  const navigate = useNavigate(); 
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "lessons" | "exams" | "trash_exams" | "analytics" | "bulk_exam" | "users" | "worksheets" | "codes" | "reports">("exams");

  // State: นักเรียน
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: "", email: "", password: "", phone: "", is_active: true, permissions: defaultPermissions });
  const [searchStudent, setSearchStudent] = useState("");
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // State: บทเรียน
  const [lessons, setLessons] = useState<any[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonFormData, setLessonFormData] = useState({
    id: 0, title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", video_url: "", pdf_url: "", description: ""
  });

  // State: ข้อสอบ
  const [exams, setExams] = useState<any[]>([]);
  const [trashExams, setTrashExams] = useState<any[]>([]);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [examModalMode, setExamModalMode] = useState<"none" | "select" | "exam_info" | "ai" | "manual" | "ai_result">("none");
  const [newExamInfo, setNewExamInfo] = useState<{ 
    title: string; grade: string[]; program: string[]; subject: string; year: string; is_timed: boolean; duration_minutes: number; shuffle_questions?: boolean;
  }>({ 
    title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", year: "2567", is_timed: true, duration_minutes: 90, shuffle_questions: false 
  });
  
  const [manualQuestions, setManualQuestions] = useState<QuestionItem[]>([
    { id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }
  ]);
  
  const [generatingExpId, setGeneratingExpId] = useState<number | null>(null);
  const [scanningQIndex, setScanningQIndex] = useState<number | null>(null);

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<QuestionItem[] | null>(null);

  // State: นำเข้าข้อสอบชุดใหญ่
  const [bulkExamForm, setBulkExamForm] = useState({
    title: "",
    subject: "คณิตศาสตร์",
    grade: ["ป.6"],
    program: ["EP"],
    year: "2567",
    duration_minutes: 90,
    is_timed: true,
    shuffle_questions: false
  });
  const [rawQuestionsJson, setRawQuestionsJson] = useState("");
  const [bulkImportStatus, setBulkImportStatus] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // State: แบบฝึกหัด
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [worksheetFormData, setWorksheetFormData] = useState({
    title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", pages: [] as string[]
  });
  const [isUploading, setIsUploading] = useState(false);

  // State: Access Codes
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodePerms, setNewCodePerms] = useState(defaultPermissions);

  // State: รายงานผลสอบ Submissions
  const [submissions, setSubmissions] = useState<any[]>([]);

  // State: Filters
  const [filterGrade, setFilterGrade] = useState("ทั้งหมด");
  const [filterProgram, setFilterProgram] = useState("ทั้งหมด");
  const [filterSubject, setFilterSubject] = useState("ทั้งหมด");

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.email) {
        navigate({ to: "/login" });
        return;
      }

      const currentEmail = session.user.email.toLowerCase().trim();

      if (!ADMIN_EMAILS.includes(currentEmail)) {
        alert("⚠️ คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        navigate({ to: "/" });
        return;
      }

      await Promise.all([
        fetchStudents(),
        fetchExams(),
        fetchLessons(),
        fetchWorksheets(),
        fetchAccessCodes(),
        fetchSubmissions()
      ]);

      setIsAuthChecking(false);
    };

    checkAuthAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email) {
        navigate({ to: "/login" });
      } else {
        const currentEmail = session.user.email.toLowerCase().trim();
        if (!ADMIN_EMAILS.includes(currentEmail)) {
          navigate({ to: "/" });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*').order('id', { ascending: true });
    if (!error && data) {
      setStudents(data);
      if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
    }
  };

  const fetchExams = async () => {
    const { data, error } = await supabase.from('exams').select('*').order('id', { ascending: false });
    if (!error && data) {
      const active = data.filter(e => e.status !== "archived");
      const trashed = data.filter(e => e.status === "archived");
      setExams(active);
      setTrashExams(trashed);
    }
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase.from('lessons').select('*').order('id', { ascending: false });
    if (!error && data) setLessons(data);
  };

  const fetchWorksheets = async () => {
    const { data, error } = await supabase.from('worksheets').select('*').order('id', { ascending: false });
    if (!error && data) setWorksheets(data);
  };

  const fetchAccessCodes = async () => {
    const { data } = await supabase.from('access_codes').select('*').order('created_at', { ascending: false });
    if (data) setAccessCodes(data);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('exam_submissions').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setSubmissions(data);
  };

  const uploadImageToStorage = async (file: File, folderName: string): Promise<string> => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: "image/jpeg" };
    let processedFile = file;
    try { processedFile = await imageCompression(file, options); } 
    catch (error) { console.warn("การบีบอัดล้มเหลว จะใช้ไฟล์ต้นฉบับแทน:", error); }

    const fileName = `${folderName}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('exam-vault-images').upload(fileName, processedFile, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('exam-vault-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleForceResetPassword = async (student: any) => {
    if (!confirm(`คุณต้องการรีเซ็ตรหัสผ่านของ ${student.name || student.email} เป็น '12345678' ใช่หรือไม่?`)) return;
    try {
      const { error } = await supabase.auth.admin.updateUserById(student.id, {
        password: "12345678"
      });
      if (error) throw error;
      alert(`✅ รีเซ็ตรหัสผ่านของ ${student.name || student.email} เป็น '12345678' เรียบร้อย!`);
    } catch (e: any) {
      alert(`การรีเซ็ตรหัสผ่านจำเป็นต้องเปิดสิทธิ์ Service Role ใน Supabase: ${e.message}`);
    }
  };

  const handleToggleStudentActive = async (student: any) => {
    const newStatus = student.is_active === false ? true : false;
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: newStatus })
        .eq('id', student.id);
      if (error) throw error;
      
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: newStatus } : s));
      if (selectedStudent?.id === student.id) {
        setSelectedStudent({ ...selectedStudent, is_active: newStatus });
      }
      alert(`อัปเดตสถานะบัญชีเป็น ${newStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} สำเร็จ`);
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาด: ${e.message}`);
    }
  };

  const handleSoftDeleteExam = async (examId: number) => {
    if (!confirm("คุณต้องการย้ายข้อสอบชุดนี้ไปไว้ใน 'ถังขยะ' ใช่หรือไม่?")) return;
    const { error } = await supabase.from('exams').update({ status: 'archived' }).eq('id', examId);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      alert("ย้ายข้อสอบเข้าถังขยะเรียบร้อย (สามารถกู้คืนได้ที่แท็บถังขยะ)");
      fetchExams();
    }
  };

  const handleRestoreExam = async (examId: number) => {
    const { error } = await supabase.from('exams').update({ status: 'published' }).eq('id', examId);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      alert("กู้คืนข้อสอบกลับสู่ระบบเรียบร้อย");
      fetchExams();
    }
  };

  const handlePermanentDeleteExam = async (examId: number) => {
    if (!confirm("🚨 ลบข้อสอบชุดนี้ออกจากระบบอย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้!")) return;
    const { error } = await supabase.from('exams').delete().eq('id', examId);
    await supabase.from('exam_submissions').delete().eq('exam_id', examId);
    if (!error) {
      alert("ลบข้อสอบถาวรเรียบร้อยแล้ว");
      fetchExams();
    }
  };

  const handleQuickUpdateExamDuration = async (exam: any) => {
    const currentMins = exam.duration_minutes || 90;
    const isCurrentlyTimed = exam.is_timed !== false;
    
    const input = prompt(`แก้ไขเวลาสอบสำหรับชุด "${exam.title}"\n\n- พิมพ์จำนวนนาทีที่ต้องการ (เช่น 60, 90, 120)\n- หรือพิมพ์ "0" หากต้องการ 'ปิดระบบจับเวลา' (ไม่จำกัดเวลา)`, isCurrentlyTimed ? String(currentMins) : "0");
    if (input === null) return;

    const num = parseInt(input.trim(), 10);
    if (isNaN(num) || num < 0) {
      alert("กรุณาระบุตัวเลขจำนวนนาทีที่ถูกต้อง");
      return;
    }

    const isTimed = num > 0;
    const durationMinutes = num > 0 ? num : 90;

    const { error } = await supabase
      .from('exams')
      .update({ is_timed: isTimed, duration_minutes: durationMinutes })
      .eq('id', exam.id);

    if (error) {
      alert("เกิดข้อผิดพลาดในการอัปเดตเวลา: " + error.message);
    } else {
      alert(`✅ อัปเดตเวลาสอบของชุด "${exam.title}" เป็น ${isTimed ? `${durationMinutes} นาที` : 'ไม่จำกัดเวลา'} เรียบร้อย!`);
      fetchExams();
    }
  };

  const hardestQuestionsStats = useMemo(() => {
    const mistakeMap: Record<string, { question: string; subject: string; examTitle: string; count: number }> = {};

    students.forEach(s => {
      (Array.isArray(s.examHistory) ? s.examHistory : []).forEach((h: any) => {
        (Array.isArray(h.mistakes) ? h.mistakes : []).forEach((m: any) => {
          const key = `${m.exam_id}_${m.qIndex}`;
          if (!mistakeMap[key]) {
            mistakeMap[key] = {
              question: m.question,
              subject: m.subject || h.subject || "ทั่วไป",
              examTitle: m.exam_title || h.title || "ข้อสอบ",
              count: 0
            };
          }
          mistakeMap[key].count += 1;
        });
      });
    });

    return Object.values(mistakeMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [students]);

  const handleExportWord = async (exam: any, includeSolutions: boolean = false) => {
    const questions: QuestionItem[] = Array.isArray(exam.questions) ? exam.questions : [];
    const choicePrefixes = ["ก.", "ข.", "ค.", "ง.", "จ."];

    const docChildren: Paragraph[] = [
      new Paragraph({ text: exam.title || "ชุดข้อสอบ", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 300 },
        children: [
          new TextRun({ text: `ระดับชั้น: ${safeGetArray(exam.grade).join(", ")}  |  `, bold: true }),
          new TextRun({ text: `แผนการเรียน: ${safeGetArray(exam.program).join(", ")}  |  `, bold: true }),
          new TextRun({ text: `วิชา: ${exam.subject}  |  ปีการศึกษา: ${exam.year || "-"}  |  เวลาสอบ: ${exam.is_timed === false ? "ไม่จำกัดเวลา" : `${exam.duration_minutes || 90} นาที`}`, bold: true }),
        ]
      }),
      new Paragraph({ text: includeSolutions ? "--- เฉลยคำตอบและคำอธิบายวิธีทำละเอียด ---" : "ชื่อ-นามสกุล: ............................................................................ เลขที่: ............ ห้อง: ............", spacing: { after: 300 } })
    ];

    questions.forEach((q, idx) => {
      docChildren.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [ new TextRun({ text: `ข้อที่ ${idx + 1}. `, bold: true }), new TextRun({ text: q.question || "" }) ] }));
      if (q.type === "choice" && q.options) {
        q.options.forEach((opt, optIdx) => {
          const isCorrect = optIdx === q.correct_index;
          docChildren.push(new Paragraph({
            spacing: { before: 40, after: 40 }, indent: { left: 400 },
            children: [ new TextRun({ text: `${choicePrefixes[optIdx] || `${optIdx + 1}.`} ${opt}` }), ...(includeSolutions && isCorrect ? [new TextRun({ text: "  ✓ (คำตอบที่ถูกต้อง)", bold: true, color: "008800" })] : []) ]
          }));
        });
      } else {
        if (includeSolutions) {
          docChildren.push(new Paragraph({ spacing: { before: 60, after: 60 }, indent: { left: 400 }, children: [ new TextRun({ text: `คำตอบที่ถูกต้อง: ${(q.subjective_answers || []).join(" หรือ ")}`, bold: true, color: "008800" }) ] }));
        } else {
          docChildren.push(new Paragraph({ spacing: { before: 80, after: 80 }, indent: { left: 400 }, text: "ตอบ: ...................................................................................................................................." }));
        }
      }
      if (includeSolutions && q.explanation) {
        docChildren.push(new Paragraph({ spacing: { before: 100, after: 160 }, indent: { left: 400 }, children: [ new TextRun({ text: "วิธีทำและคำอธิบาย: ", bold: true, color: "555555" }), new TextRun({ text: q.explanation, color: "555555" }) ] }));
      }
    });

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${exam.title || "Exam"}_${includeSolutions ? "เฉลย" : "ชุดข้อสอบ"}.docx`);
  };

  const handleExportCSV = () => {
    if (students.length === 0) return alert("ไม่มีข้อมูลนักเรียนให้ส่งออก");
    const headers = ["ID", "ชื่อ-นามสกุล", "อีเมล", "เบอร์โทร", "สถานะ", "คะแนนเฉลี่ยคณิต", "คะแนนเฉลี่ยวิทย์", "คะแนนเฉลี่ยอังกฤษ", "จำนวนข้อสอบที่ทำ"];
    const rows = students.map(s => [
      s.id, `"${s.name || ""}"`, `"${s.email || ""}"`, `"${s.phone || ""}"`, s.is_active === false ? "ระงับ" : "ปกติ",
      s.scores?.math || 0, s.scores?.science || 0, s.scores?.english || 0, (s.examHistory || []).length
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri); link.setAttribute("download", `exam_vault_students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportSubmissionsCSV = () => {
    if (submissions.length === 0) return alert("ไม่มีข้อมูลผลสอบสำหรับส่งออก");
    const headers = ["ID", "Student Name", "Subject", "Program", "Year", "Score", "Total", "Percentage", "Date"];
    const rows = submissions.map(s => [
      s.id,
      `"${(s.student_name || "").replace(/"/g, '""')}"`,
      `"${s.subject || ""}"`,
      `"${s.program || ""}"`,
      s.year || "",
      s.score || 0,
      s.total || 0,
      `${s.percentage || 0}%`,
      `"${s.created_at || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `exam_results_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("โครงสร้างไฟล์ CSV ต้องมีคอลัมน์: email, password, name, phone\n(รหัสผ่านถ้าเว้นว่าง ระบบจะตั้งให้เป็น 12345678 อัตโนมัติ)\n\nคุณแน่ใจหรือไม่ที่จะเริ่มนำเข้านักเรียน?")) { e.target.value = ""; return; }
    
    setIsImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results: any) => {
        const rows = results.data as any[];
        let successCount = 0; let failCount = 0;
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        for (const row of rows) {
          const email = (row.email || row.Email)?.trim();
          const password = (row.password || row.Password)?.trim() || "12345678";
          const name = (row.name || row.Name)?.trim() || "";
          const phone = (row.phone || row.Phone)?.trim() || "";
          if (!email) continue;
          
          const { error: authError } = await supabase.auth.signUp({ email, password });
          if (authError) { failCount++; continue; }

          const { error: dbError } = await supabase.from('students').insert([{ name, email, phone, is_active: true, permissions: defaultPermissions, scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 }, examHistory: [] }]);
          if (!dbError) successCount++; else failCount++;
        }
        if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
        
        alert(`กระบวนการนำเข้าเสร็จสิ้น!\n✅ นำเข้าสำเร็จ: ${successCount} คน\n❌ ล้มเหลว/อีเมลซ้ำ: ${failCount} คน`);
        setIsImporting(false); fetchStudents(); e.target.value = "";
      },
      error: (err: any) => { alert("เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: " + err.message); setIsImporting(false); e.target.value = ""; }
    });
  };

  const handleBulkImportExam = async () => {
    if (!bulkExamForm.title.trim()) {
      alert("กรุณากรอกชื่อชุดข้อสอบ");
      return;
    }

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(rawQuestionsJson);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("รูปแบบต้องเป็น Array ของคำถาม และมีอย่างน้อย 1 ข้อ");
      }
    } catch (e: any) {
      alert(`❌ รูปแบบ JSON ไม่ถูกต้อง:\n${e.message}`);
      return;
    }

    setIsBulkImporting(true);
    setBulkImportStatus("กำลังนำเข้าข้อสอบเข้าสู่ Supabase...");

    try {
      const payload = {
        title: bulkExamForm.title,
        subject: bulkExamForm.subject,
        grade: bulkExamForm.grade.join(", "),
        program: bulkExamForm.program.join(", "),
        year: bulkExamForm.year,
        duration_minutes: Number(bulkExamForm.duration_minutes),
        is_timed: bulkExamForm.is_timed,
        shuffle_questions: bulkExamForm.shuffle_questions,
        status: "published",
        total_questions: parsedQuestions.length,
        questions: parsedQuestions
      };

      const { error } = await supabase.from("exams").insert([payload]);
      if (error) throw error;

      setBulkImportStatus(`🎉 นำเข้าข้อสอบชุด "${bulkExamForm.title}" (${parsedQuestions.length} ข้อ) สำเร็จเรียบร้อย!`);
      setRawQuestionsJson("");
      setBulkExamForm(prev => ({ ...prev, title: "" }));
      fetchExams();
    } catch (e: any) {
      setBulkImportStatus(`❌ เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const loadSampleJson = () => {
    const sample = [
      {
        type: "choice",
        question: "ถ้า 2x + 5 = 15 แล้ว x มีค่าเท่าใด?",
        options: ["3", "4", "5", "6"],
        correct_index: 2,
        explanation: "ย้ายข้างสมการ: 2x = 15 - 5\n2x = 10\nx = 5",
        image_url: ""
      },
      {
        type: "subjective",
        question: "จงหาพื้นที่รูปสี่เหลี่ยมจัตุรัสที่มีความยาวด้านละ 8 เซนติเมตร (ตอบเฉพาะตัวเลข)",
        subjective_answers: ["64", "64 ตร.ซม."],
        explanation: "สูตรพื้นที่สี่เหลี่ยมจัตุรัส = ด้าน × ด้าน\n= 8 × 8 = 64 ตารางเซนติเมตร",
        image_url: ""
      }
    ];
    setRawQuestionsJson(JSON.stringify(sample, null, 2));
  };

  const handleQuickToggleStudentPermission = (studentId: number, permKey: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const currentPerms = s.permissions || {};
        return {
          ...s,
          permissions: {
            ...currentPerms,
            [permKey]: !currentPerms[permKey]
          }
        };
      }
      return s;
    }));
  };

  const handleQuickSaveStudentPermission = async (student: any) => {
    setSavingStudentId(student.id);
    try {
      const { error } = await supabase
        .from("students")
        .update({ permissions: student.permissions })
        .eq("id", student.id);

      if (error) throw error;
      alert(`✅ บันทึกสิทธิ์ของ ${student.name || student.email} สำเร็จ!`);
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleDuplicateExam = async (exam: any) => {
    const duplicatedPayload = { ...exam, id: undefined, title: `${exam.title} (สำเนา)`, created_at: new Date().toISOString() };
    delete duplicatedPayload.id;
    const { error } = await supabase.from('exams').insert([duplicatedPayload]);
    if (error) alert("คัดลอกไม่สำเร็จ: " + error.message); else { alert("คัดลอกชุดข้อสอบเรียบร้อยแล้ว"); fetchExams(); }
  };

  const handleDuplicateWorksheet = async (ws: any) => {
    const duplicatedPayload = { ...ws, id: undefined, title: `${ws.title} (สำเนา)` };
    delete duplicatedPayload.id;
    const { error } = await supabase.from('worksheets').insert([duplicatedPayload]);
    if (error) alert("คัดลอกไม่สำเร็จ: " + error.message); else { alert("คัดลอกแบบฝึกหัดเรียบร้อยแล้ว"); fetchWorksheets(); }
  };

  const handleCreateAccessCode = async () => {
    if (!newCodeName.trim()) return alert("กรุณาใส่ชื่อรหัสโค้ด");
    const code = newCodeName.toUpperCase().replace(/\s+/g, "");
    const { error } = await supabase.from('access_codes').insert([{ code, permissions: newCodePerms, is_active: true }]);
    if (error) alert("สร้างโค้ดไม่สำเร็จ: " + error.message); else { alert(`สร้างโค้ด ${code} สำเร็จ!`); setNewCodeName(""); fetchAccessCodes(); }
  };

  const handleDeleteAccessCode = async (id: string | number) => {
    if (confirm("ต้องการลบโค้ดนี้ใช่หรือไม่?")) {
      const { error } = await supabase.from('access_codes').delete().eq('id', id);
      if (!error) fetchAccessCodes();
    }
  };

  const handleOpenAddStudent = () => { setFormData({ id: 0, name: "", email: "", password: "", phone: "", is_active: true, permissions: defaultPermissions }); setIsEditing(false); setShowStudentModal(true); };
  const handleOpenEditStudent = (student: any) => { setFormData({ ...student, password: "", is_active: student.is_active !== false, permissions: student.permissions || defaultPermissions }); setIsEditing(true); setShowStudentModal(true); };
  const handleTogglePermission = (key: string) => { setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key as keyof typeof prev.permissions] } })); };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      const { error } = await supabase.from('students').update({ name: formData.name, email: formData.email, phone: formData.phone, is_active: formData.is_active, permissions: formData.permissions }).eq('id', formData.id);
      if (error) alert("เกิดข้อผิดพลาดในการอัปเดต: " + error.message);
      else { alert("อัปเดตข้อมูลและสิทธิ์นักเรียนสำเร็จ!"); fetchStudents(); if (selectedStudent?.id === formData.id) setSelectedStudent({ ...selectedStudent, ...formData }); }
    } else {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const { error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
      if (authError) return alert("ไม่สามารถสร้างบัญชีได้: " + authError.message);
      if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      const { error } = await supabase.from('students').insert([{ name: formData.name, email: formData.email, phone: formData.phone, is_active: true, permissions: formData.permissions, scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 }, examHistory: [] }]);
      if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("สร้างบัญชีนักเรียนสำเร็จ!"); fetchStudents(); }
    }
    setShowStudentModal(false);
  };

  const handleDeleteStudent = async (id: number) => { 
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบนักเรียนคนนี้? ข้อมูลและคะแนนสอบทั้งหมดจะหายไปอย่างถาวร!")) { 
      const { error } = await supabase.from('students').delete().eq('id', id);
      await supabase.from('exam_submissions').delete().eq('student_id', id);
      if (!error) { fetchStudents(); if (selectedStudent?.id === id) setSelectedStudent(null); }
    } 
  };

  const handleDeleteAllStudents = async () => {
    if (students.length === 0) return alert("ไม่มีข้อมูลนักเรียนในระบบ");
    if (prompt("🚨 คำเตือนขั้นสูง: พิมพ์คำว่า 'DELETE ALL' เพื่อยืนยัน:") !== "DELETE ALL") return;
    const { error } = await supabase.from('students').delete().neq('id', 0);
    await supabase.from('exam_submissions').delete().neq('id', 0);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("ลบข้อมูลนักเรียนทั้งหมดในระบบเรียบร้อยแล้ว"); setSelectedStudent(null); fetchStudents(); }
  };

  const handleResetAllStudentsData = async () => {
    if (students.length === 0) return alert("ไม่มีข้อมูลนักเรียนในระบบ");
    if (!confirm("⚠️ คุณต้องการรีเซ็ตผลสอบ ประวัติ และคะแนนของนักเรียน 'ทุกคน' ใช่หรือไม่?\n\n* บัญชีและสิทธิ์จะยังคงอยู่\n* สถิติและประวัติสอบจะถูกเคลียร์เป็น 0 ทั้งหมด")) return;
    const { error } = await supabase.from('students').update({ examHistory: [], scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 } }).neq('id', 0);
    await supabase.from('exam_submissions').delete().neq('id', 0);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("รีเซ็ตผลสอบของนักเรียนทุกคนเรียบร้อยแล้ว"); fetchStudents(); if (selectedStudent) setSelectedStudent({ ...selectedStudent, examHistory: [], scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 } }); }
  };

  const handleDeleteStudentHistory = async (studentToUpdate: any, historyId: number, examId: number) => {
    if (!confirm("⚠️ ต้องการลบประวัติการสอบชุดนี้ใช่หรือไม่?")) return;
    const newHistory = (studentToUpdate.examHistory || []).filter((h: any) => h.id !== historyId);
    const { error } = await supabase.from('students').update({ examHistory: newHistory }).eq('id', studentToUpdate.id);
    if (error) return alert("เกิดข้อผิดพลาด: " + error.message);
    await supabase.from('exam_submissions').delete().eq('student_id', studentToUpdate.id).eq('exam_id', examId);
    alert("ลบประวัติการสอบเรียบร้อย"); fetchStudents(); setSelectedStudent({ ...studentToUpdate, examHistory: newHistory });
  };

  const handleResetStudentData = async (studentToUpdate: any) => {
    if (!confirm("🚨 คำเตือน: คุณต้องการรีเซ็ตผลสอบทั้งหมดของนักเรียนคนนี้ใช่หรือไม่?")) return;
    const { error } = await supabase.from('students').update({ examHistory: [], scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 } }).eq('id', studentToUpdate.id);
    if (error) return alert("เกิดข้อผิดพลาด: " + error.message);
    await supabase.from('exam_submissions').delete().eq('student_id', studentToUpdate.id);
    alert("รีเซ็ตข้อมูลนักเรียนเป็นค่าเริ่มต้นเรียบร้อยแล้ว"); fetchStudents(); setSelectedStudent({ ...studentToUpdate, examHistory: [], scores: { math: 0, english: 0, science: 0, thai: 0, social: 0 } });
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lessonFormData.grade.length === 0) return alert("กรุณาเลือกระดับชั้นอย่างน้อย 1 รายการ");
    if (lessonFormData.program.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 รายการ");
    const payload = { title: lessonFormData.title, grade: lessonFormData.grade.join(", "), program: lessonFormData.program.join(", "), subject: lessonFormData.subject, video_url: lessonFormData.video_url, pdf_url: lessonFormData.pdf_url, description: lessonFormData.description };
    if (lessonFormData.id) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', lessonFormData.id);
      if (error) alert("อัปเดตบทเรียนไม่สำเร็จ: " + error.message); else fetchLessons();
    } else {
      const { error } = await supabase.from('lessons').insert([payload]);
      if (error) alert("เพิ่มบทเรียนไม่สำเร็จ: " + error.message); else fetchLessons();
    }
    setShowLessonModal(false);
  };

  const handleDeleteLesson = async (id: number) => { if (confirm("ลบบทเรียนนี้ออกจากระบบ?")) { const { error } = await supabase.from('lessons').delete().eq('id', id); if (!error) fetchLessons(); } };
  const handleDeleteFilteredLessons = async () => {
    if (filteredLessons.length === 0) return alert("ไม่มีบทเรียนในหมวดหมู่นี้");
    if (!confirm(`คุณต้องการลบบทเรียนในหมวด (${filterGrade} / ${filterProgram} / ${filterSubject}) ทั้งหมด ${filteredLessons.length} บทเรียนใช่หรือไม่?`)) return;
    const ids = filteredLessons.map(l => l.id); const { error } = await supabase.from('lessons').delete().in('id', ids);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("ลบบทเรียนในหมวดหมู่ที่เลือกเรียบร้อย"); fetchLessons(); }
  };
  const handleDeleteAllLessons = async () => {
    if (lessons.length === 0) return alert("ไม่มีบทเรียนในระบบ");
    if (!confirm("🚨 ต้องการลบบทเรียน 'ทั้งหมดในระบบ' หรือไม่?")) return;
    const { error } = await supabase.from('lessons').delete().neq('id', 0);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("ลบบทเรียนทั้งหมดเรียบร้อยแล้ว"); fetchLessons(); }
  };

  const handleUploadWorksheetImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(e.target.files); const uploadedUrls: string[] = [];
      try { for (const file of files) { const url = await uploadImageToStorage(file, 'worksheets'); uploadedUrls.push(url); } setWorksheetFormData(prev => ({ ...prev, pages: [...prev.pages, ...uploadedUrls] })); } 
      catch (error) { alert("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่"); console.error(error); } finally { setIsUploading(false); }
    }
  };

  const handleSaveWorksheet = async () => {
    if (!worksheetFormData.title) return alert("กรุณาใส่ชื่อชุดแบบฝึกหัด");
    if (worksheetFormData.pages.length === 0) return alert("กรุณาอัปโหลดรูปภาพแบบฝึกหัดอย่างน้อย 1 หน้า");
    const payload = { title: worksheetFormData.title, grade: worksheetFormData.grade.join(", "), program: worksheetFormData.program.join(", "), subject: worksheetFormData.subject, pages: worksheetFormData.pages };
    const { error } = await supabase.from('worksheets').insert([payload]);
    if (error) alert("เกิดข้อผิดพลาดในการบันทึกแบบฝึกหัด: " + error.message);
    else { alert("เพิ่มแบบฝึกหัดเข้าระบบสำเร็จ!"); setShowWorksheetModal(false); setWorksheetFormData({ title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", pages: [] }); fetchWorksheets(); }
  };

  const handleDeleteWorksheet = async (id: number) => { if (confirm("ต้องการลบแบบฝึกหัดชุดนี้ออกจากระบบ?")) { const { error } = await supabase.from('worksheets').delete().eq('id', id); if (!error) fetchWorksheets(); } };
  const handleDeleteFilteredWorksheets = async () => {
    if (filteredWorksheets.length === 0) return alert("ไม่มีแบบฝึกหัดในหมวดหมู่นี้");
    if (!confirm(`คุณต้องการลบแบบฝึกหัดในหมวด (${filterGrade} / ${filterProgram} / ${filterSubject}) ทั้งหมด ${filteredWorksheets.length} ชุดใช่หรือไม่?`)) return;
    const ids = filteredWorksheets.map(w => w.id); const { error } = await supabase.from('worksheets').delete().in('id', ids);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("ลบแบบฝึกหัดในหมวดหมู่ที่เลือกเรียบร้อย"); fetchWorksheets(); }
  };
  const handleDeleteAllWorksheets = async () => {
    if (worksheets.length === 0) return alert("ไม่มีแบบฝึกหัดในระบบ");
    if (!confirm("🚨 ต้องการลบแบบฝึกหัด 'ทั้งหมดในระบบ' หรือไม่?")) return;
    const { error } = await supabase.from('worksheets').delete().neq('id', 0);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message); else { alert("ลบแบบฝึกหัดทั้งหมดเรียบร้อยแล้ว"); fetchWorksheets(); }
  };

  const handleOpenEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    const safeGrades = safeGetArray(exam.grade);
    const safePrograms = safeGetArray(exam.program);

    setNewExamInfo({ 
      title: exam.title, 
      grade: safeGrades.length > 0 ? safeGrades : ["ป.6"], 
      program: safePrograms.length > 0 ? safePrograms : ["ISM"], 
      subject: exam.subject, 
      year: exam.year || "2566", 
      is_timed: exam.is_timed !== false, 
      duration_minutes: exam.duration_minutes || 90, 
      shuffle_questions: exam.shuffle_questions || false 
    });
    
    const parsedQuestions: QuestionItem[] = (Array.isArray(exam.questions) ? exam.questions : []).map((q: any, idx: number) => ({ id: q.id || idx + 1, type: q.type === "subjective" ? "subjective" : "choice", question: q.question || "", image_url: q.image_url || "", options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""], correct_index: typeof q.correct_index === "number" ? q.correct_index : 0, subjective_answers: Array.isArray(q.subjective_answers) && q.subjective_answers.length > 0 ? q.subjective_answers : [""], explanation: q.explanation || "" }));
    setManualQuestions(parsedQuestions.length > 0 ? parsedQuestions : [ { id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" } ]);
    setExamModalMode("manual");
  };

  const addManualQuestion = () => { setManualQuestions(prev => [ ...prev, { id: Date.now(), type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" } ]); };
  const removeManualQuestion = (index: number) => { if (manualQuestions.length === 1) return alert("ต้องมีอย่างน้อย 1 ข้อคำถาม"); setManualQuestions(prev => prev.filter((_, i) => i !== index)); };
  
  const toggleQuestionType = (index: number, newType: "choice" | "subjective") => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === index) return { ...q, type: newType, options: q.options && q.options.length > 0 ? q.options : ["", "", "", ""], subjective_answers: q.subjective_answers && q.subjective_answers.length > 0 ? q.subjective_answers : [""] };
      return q;
    }));
  };

  const updateQuestionText = (index: number, text: string) => setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, question: text } : q));
  const updateQuestionExplanation = (index: number, text: string) => setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, explanation: text } : q));
  
  const updateQuestionImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try { const file = e.target.files[0]; const url = await uploadImageToStorage(file, 'exam-questions'); setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, image_url: url } : q)); } 
      catch (error) { alert("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่"); console.error(error); } 
      finally { setIsUploading(false); }
    }
  };

  const removeQuestionImage = (index: number) => { setManualQuestions(prev => prev.map((q, i) => { if (i === index) { const isNeedsImage = q.question.includes("จากรูป"); return { ...q, image_url: isNeedsImage ? "NEEDS_IMAGE" : "" }; } return q; })); };
  const addOptionToQuestion = (qIndex: number) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) { if (q.options.length >= 5) { alert("เพิ่มตัวเลือกได้สูงสุด 5 ช้อยส์"); return q; } return { ...q, options: [...q.options, ""] }; } return q; })); };
  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) { if (q.options.length <= 2) { alert("ต้องมีอย่างน้อย 2 ตัวเลือก"); return q; } const updated = q.options.filter((_, oi) => oi !== optIndex); const prevCorrect = q.correct_index ?? 0; return { ...q, options: updated, correct_index: prevCorrect >= updated.length ? 0 : prevCorrect }; } return q; })); };
  const updateOptionText = (qIndex: number, optIndex: number, text: string) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) { const nextOpts = [...q.options]; nextOpts[optIndex] = text; return { ...q, options: nextOpts }; } return q; })); };
  const setCorrectOption = (qIndex: number, optIndex: number) => setManualQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, correct_index: optIndex } : q));
  const addSubjectiveAnswerLine = (qIndex: number) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) return { ...q, subjective_answers: [...(q.subjective_answers || []), ""] }; return q; })); };
  const removeSubjectiveAnswerLine = (qIndex: number, lineIndex: number) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) { const currentLines = q.subjective_answers || []; if (currentLines.length <= 1) { alert("ต้องมีอย่างน้อย 1 ช่องคำตอบ"); return q; } return { ...q, subjective_answers: currentLines.filter((_, li) => li !== lineIndex) }; } return q; })); };
  const updateSubjectiveAnswerText = (qIndex: number, lineIndex: number, text: string) => { setManualQuestions(prev => prev.map((q, i) => { if (i === qIndex) { const currentLines = [...(q.subjective_answers || [""])]; currentLines[lineIndex] = text; return { ...q, subjective_answers: currentLines }; } return q; })); };

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resString = reader.result as string;
        if (resString && resString.includes(',')) {
          resolve(resString.split(',')[1] || "");
        } else {
          reject(new Error("แปลงไฟล์ไม่สำเร็จ"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleScanSingleQuestion = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return; 
    
    setScanningQIndex(qIndex);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resString = reader.result as string;
          resolve(resString && resString.includes(',') ? resString.split(',')[1] || "" : "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const promptText = `วิเคราะห์รูปภาพโจทย์ข้อสอบ (1 ข้อ) แล้วแปลงข้อมูลเป็นรูปแบบ JSON
{ 
  "type": "choice" หรือ "subjective",
  "question": "ข้อความโจทย์คำถาม", 
  "options": ["คำตอบข้อ1", "คำตอบข้อ2", "คำตอบข้อ3", "คำตอบข้อ4"],
  "correct_index": 0,
  "subjective_answers": ["คำตอบบรรทัดที่ 1", "คำตอบบรรทัดที่ 2 (ถ้ามี)"],
  "explanation": "เฉลยวิธีทำ (ถ้ามีในรูป)"
}
คำแนะนำสำคัญ (ข้อควรระวัง): 
1. ในฟิลด์ options ให้ใส่เฉพาะ "เนื้อหาคำตอบ" เท่านั้น ห้ามใส่ ก. ข. ค. ง. จ. นำหน้าเด็ดขาด!
2. หากโจทย์มีสัญลักษณ์ทางคณิตศาสตร์ ให้ใช้สัญลักษณ์ตามนี้แทน ห้ามใช้ LaTeX หรือ $: มุมพิมพ์ ∠, องศาพิมพ์ °, ขนานพิมพ์ //, เศษส่วนพิมพ์ 1/2 หรือ ½, ยกกำลังพิมพ์ ^2 หรือ ²
3. ตอบกลับมาเป็นโครงสร้าง JSON เพียวๆ เท่านั้น ห้ามมีคำอธิบายเพิ่มเติม`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("ไม่พบ API Key กรุณาตรวจสอบไฟล์ .env");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }] }) 
      });

      const data = await response.json();
      
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedText);

        setManualQuestions(prev => prev.map((q, i) => {
          if (i === qIndex) {
            return {
              ...q,
              type: parsed.type === "subjective" ? "subjective" : "choice",
              question: parsed.question || q.question,
              options: Array.isArray(parsed.options) && parsed.options.length > 0 
                ? parsed.options.map((opt: string) => typeof opt === "string" ? opt.replace(/^[กขคงจ]\s*\.\s*/, '').trim() : opt)
                : q.options,
              correct_index: typeof parsed.correct_index === "number" ? parsed.correct_index : q.correct_index,
              subjective_answers: Array.isArray(parsed.subjective_answers) && parsed.subjective_answers.length > 0 ? parsed.subjective_answers : q.subjective_answers,
              explanation: parsed.explanation || q.explanation
            };
          }
          return q;
        }));
        
      } else {
        throw new Error(data.error?.message || "ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้");
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      alert(`ขัดข้อง: ${error.message}`);
    } finally {
      setScanningQIndex(null);
      e.target.value = "";
    }
  };

  const handleGenerateExplanation = async (qIndex: number) => {
    const q = manualQuestions[qIndex];
    if (!q) return; 
    
    if (!q.question && (!q.image_url || q.image_url === "NEEDS_IMAGE")) {
      return alert("กรุณาพิมพ์โจทย์คำถามหรืออัปโหลดรูปภาพก่อน เพื่อให้ AI รู้ว่าต้องเฉลยอะไร");
    }

    setGeneratingExpId(qIndex);
    try {
      let promptText = "";
      const questionText = q.question ? q.question : "วิเคราะห์และแก้โจทย์ปัญหาจากรูปภาพประกอบ";

      if (q.type === "choice") {
        const correctAns = q.options[q.correct_index || 0];
        promptText = `ในฐานะครูผู้เชี่ยวชาญ จงเขียนอธิบายเฉลยและวิธีทำอย่างละเอียดสำหรับโจทย์ข้อนี้\nโจทย์: ${questionText}\nตัวเลือก: ${q.options.join(", ")}\nคำตอบที่ถูกต้องคือ: ${correctAns}\nอธิบายทีละขั้นตอนให้เด็กเข้าใจง่าย ไม่ต้องเกริ่นนำ ให้พิมพ์เนื้อหาคำอธิบายได้เลย\n\nคำแนะนำสำคัญ: ห้ามใช้โค้ด LaTeX หรือเครื่องหมาย $ ในการเขียนสมการเด็ดขาด ให้พิมพ์เป็นข้อความธรรมดา หรือสัญลักษณ์แบบ Unicode แทน (เช่น เศษส่วนพิมพ์ 1/2, ยกกำลังพิมพ์ ^2, องศาพิมพ์ °, ขนานพิมพ์ //) เครื่องหมายคูณให้ใช้ตัว x เล็ก`;
      } else {
        const correctAns = (q.subjective_answers || []).join(", ");
        promptText = `ในฐานะครูผู้เชี่ยวชาญ จงเขียนอธิบายเฉลยและวิธีทำอย่างละเอียดสำหรับโจทย์ข้อนี้\nโจทย์: ${questionText}\nคำตอบที่ถูกต้องคือ: ${correctAns}\nอธิบายทีละขั้นตอนให้เด็กเข้าใจง่าย ไม่ต้องเกริ่นนำ ให้พิมพ์เนื้อหาคำอธิบายได้เลย\n\nคำแนะนำสำคัญ: ห้ามใช้โค้ด LaTeX หรือเครื่องหมาย $ ในการเขียนสมการเด็ดขาด ให้พิมพ์เป็นข้อความธรรมดา หรือสัญลักษณ์แบบ Unicode แทน (เช่น เศษส่วนพิมพ์ 1/2, ยกกำลังพิมพ์ ^2, องศาพิมพ์ °, ขนานพิมพ์ //) เครื่องหมายคูณให้ใช้ตัว x เล็ก`;
      }

      const requestParts: any[] = [{ text: promptText }];

      if (q.image_url && q.image_url !== "NEEDS_IMAGE") {
        try {
          const base64Data = await urlToBase64(q.image_url);
          requestParts.push({
            inline_data: { mime_type: "image/jpeg", data: base64Data }
          });
        } catch (imgErr) {
          console.error("AI Image Load Error:", imgErr);
          throw new Error("ระบบดึงรูปภาพล้มเหลว (ตรวจสอบการตั้งค่า CORS ของ Supabase Storage)");
        }
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("ไม่พบ API Key กรุณาตรวจสอบไฟล์ .env");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ contents: [{ parts: requestParts }] }) 
      });

      const data = await response.json();
      
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
         updateQuestionExplanation(qIndex, data.candidates[0].content.parts[0].text.trim());
      } else {
         throw new Error(data.error?.message || "ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้");
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      alert(`ขัดข้อง: ${error.message}`);
    } finally {
      setGeneratingExpId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setPreviewImages(prev => [...prev, ...urls]); 
    }
  };

  const removeImage = (indexToRemove: number) => setPreviewImages(prev => prev.filter((_, index) => index !== indexToRemove));

  const processImageWithAI = async () => {
    if (previewImages.length === 0) return;
    setIsAiProcessing(true);
    setAiResult(null);

    try {
      const imageParts = await Promise.all(
        previewImages.map(async (imgUrl) => {
          const base64Data = await urlToBase64(imgUrl);
          return { inline_data: { mime_type: "image/jpeg", data: base64Data } };
        })
      );

      const promptText = `วิเคราะห์รูปภาพข้อสอบเหล่านี้ (เรียงตามลำดับหน้า) แล้วแปลงข้อมูลเป็นรูปแบบ JSON 
โดยโครงสร้าง JSON จะต้องเป็น Array ของ Object แต่ละ Object คือ 1 ข้อคำถาม ประกอบด้วยฟิลด์ดังนี้:
{ 
  "id": 1,
  "type": "choice" หรือ "subjective",
  "question": "ข้อความโจทย์คำถาม", 
  "image_url": "",
  "options": ["คำตอบข้อ1", "คำตอบข้อ2", "คำตอบข้อ3", "คำตอบข้อ4"],
  "correct_index": 0,
  "subjective_answers": ["คำตอบบรรทัดที่ 1/คีย์เวิร์ด", "คำตอบบรรทัดที่ 2 (ถ้ามี)"],
  "explanation": "เขียนคำอธิบายเฉลยและวิธีทำอย่างละเอียด แสดงขั้นตอนการคิดคำนวณ สูตร หรือเหตุผลอย่างชัดเจน"
}
คำแนะนำสำคัญ (ข้อควรระวัง): 
1. ในฟิลด์ options ให้ใส่เฉพาะ "เนื้อหาคำตอบ" เท่านั้น ห้ามใส่ตัวอักษร ก. ข. ค. ง. จ. นำหน้าเด็ดขาด!
2. หากโจทย์ข้อนั้นมี "รูปภาพเรขาคณิต" ประกอบโจทย์ หรือในโจทย์มีคำว่า "จากรูป" ให้ใส่ค่าในฟิลด์ image_url เป็น "NEEDS_IMAGE" เพื่อแจ้งเตือนระบบ
3. หากเฉลยในรูปมีการโยงลูกศรแบบรูปภาพ ให้เขียนอธิบายเป็น text ในช่อง explanation แทนการแปลงเป็นเครื่องหมายแปลกๆ
4. ตอบกลับมาเป็นโครงสร้าง JSON เพียวๆ เท่านั้น ห้ามใส่ markdown code block
5. ห้ามใช้โค้ด LaTeX หรือสัญลักษณ์ $ ในการเขียนสมการเด็ดขาด ให้พิมพ์เป็นข้อความธรรมดา หรือสัญลักษณ์แบบ Unicode แทน (เช่น เศษส่วนพิมพ์ 1/2, ยกกำลังพิมพ์ ^2, องศาพิมพ์ °, ขนานพิมพ์ //)`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("ไม่พบ API Key กรุณาตรวจสอบไฟล์ .env");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, ...imageParts] }] }) 
      });

      const data = await response.json();
      
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json|```/g, "").trim();
        const parsedJsonResult = JSON.parse(cleanedText);

        const formatted: QuestionItem[] = (Array.isArray(parsedJsonResult) ? parsedJsonResult : [parsedJsonResult]).map((item: any, idx: number) => {
          const isNeedsImage = item.image_url === "NEEDS_IMAGE" || (item.question || "").includes("จากรูป");

          return {
            id: idx + 1,
            type: item.type === "subjective" ? "subjective" : "choice",
            question: item.question || "",
            image_url: isNeedsImage ? "NEEDS_IMAGE" : "",
            options: Array.isArray(item.options) && item.options.length > 0 
              ? item.options.map((opt: string) => typeof opt === "string" ? opt.replace(/^[กขคงจ]\s*\.\s*/, '').trim() : opt)
              : ["", "", "", ""],
            correct_index: typeof item.correct_index === "number" ? item.correct_index : 0,
            subjective_answers: Array.isArray(item.subjective_answers) && item.subjective_answers.length > 0 ? item.subjective_answers : [""],
            explanation: item.explanation || ""
          };
        });

        setAiResult(formatted);
        setExamModalMode("ai_result");
      } else {
        throw new Error(data.error?.message || "ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้");
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      alert(`ขัดข้อง: ${error.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSaveExamToDB = async (questionsToSave: QuestionItem[]) => {
    if (!questionsToSave || questionsToSave.length === 0) return alert("ไม่มีข้อสอบให้บันทึก");
    if (newExamInfo.grade.length === 0) return alert("กรุณาเลือกระดับชั้นอย่างน้อย 1 รายการ");
    if (newExamInfo.program.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 รายการ");

    let finalQuestions = [...questionsToSave];
    const missingImages = finalQuestions.some(q => q.image_url === "NEEDS_IMAGE");
    if (missingImages) {
      const confirmSave = confirm("มีบางข้อที่จำเป็นต้องใช้รูปภาพประกอบ แต่คุณยังไม่ได้อัปโหลดรูปให้ (แถบสีแดง)\nคุณต้องการบันทึกข้อสอบโดยไม่มีรูปภาพใช่หรือไม่?");
      if (!confirmSave) return; 
      
      finalQuestions = finalQuestions.map(q => ({
        ...q,
        image_url: q.image_url === "NEEDS_IMAGE" ? "" : (q.image_url || "")
      }));
    }

    const examPayload = {
      title: newExamInfo.title,
      grade: newExamInfo.grade.join(", "),
      program: newExamInfo.program.join(", "),
      subject: newExamInfo.subject,
      year: newExamInfo.year,
      is_timed: newExamInfo.is_timed !== false, 
      duration_minutes: Number(newExamInfo.duration_minutes) || 90, 
      shuffle_questions: newExamInfo.shuffle_questions,
      questions: finalQuestions,
      total_questions: finalQuestions.length,
      status: "published"
    };

    if (editingExamId) {
      const { error } = await supabase.from('exams').update(examPayload).eq('id', editingExamId);
      if (error) alert("เกิดข้อผิดพลาดในการอัปเดตข้อสอบ: " + error.message);
      else {
        alert("อัปเดตชุดข้อสอบสำเร็จ!");
        setExamModalMode("none");
        setEditingExamId(null);
        fetchExams();
      }
    } else {
      const { error } = await supabase.from('exams').insert([examPayload]);
      if (error) alert("เกิดข้อผิดพลาดในการบันทึกข้อสอบ: " + error.message);
      else {
        alert("บันทึกข้อสอบเข้าระบบสำเร็จ!");
        setExamModalMode("none");
        setPreviewImages([]);
        setManualQuestions([{ id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }]);
        fetchExams();
      }
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (confirm("ลบข้อสอบชุดนี้ออกจากระบบอย่างถาวรหรือไม่?")) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      await supabase.from('exam_submissions').delete().eq('exam_id', id);
      if (!error) fetchExams();
    }
  };

  const handleDeleteFilteredExams = async () => {
    if (filteredExams.length === 0) return alert("ไม่มีข้อสอบในหมวดหมู่นี้");
    if (!confirm(`คุณต้องการลบข้อสอบในหมวด (${filterGrade} / ${filterProgram} / ${filterSubject}) ทั้งหมด ${filteredExams.length} ชุดใช่หรือไม่?`)) return;

    const ids = filteredExams.map(e => e.id);
    const { error } = await supabase.from('exams').delete().in('id', ids);
    await supabase.from('exam_submissions').delete().in('exam_id', ids);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      alert("ลบข้อสอบในหมวดหมู่ที่เลือกเรียบร้อย");
      fetchExams();
    }
  };

  const handleDeleteAllExams = async () => {
    if (exams.length === 0) return alert("ไม่มีข้อสอบในระบบ");
    if (!confirm("🚨 ต้องการลบข้อสอบ 'ทั้งหมดในระบบ' หรือไม่? ผลคะแนนและประวัติการสอบที่ผูกกันจะหายไปทั้งหมด!")) return;
    const { error } = await supabase.from('exams').delete().neq('id', 0);
    await supabase.from('exam_submissions').delete().neq('id', 0);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      alert("ลบข้อสอบทั้งหมดเรียบร้อยแล้ว");
      fetchExams();
    }
  };

  const handleLogout = async () => {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    }
  };

  const getActivePermissionsText = (perms: any, keys: string[]) => {
    if (!perms) return "-";
    const active = keys.filter((k: string) => perms[k]);
    return active.length > 0 ? active.join(", ") : "ไม่มีสิทธิ์";
  };

  const matchFilterSubject = (itemSubject: string, filterSub: string) => {
    if (filterSub === "ทั้งหมด") return true;
    if (!itemSubject) return false;
    const cleanItem = itemSubject.trim().toLowerCase();
    const cleanFilter = filterSub.trim().toLowerCase();
    return cleanItem === cleanFilter || cleanItem.includes(cleanFilter);
  };

  const matchFilterGrade = (itemGrades: string[], filterG: string) => filterG === "ทั้งหมด" || itemGrades.includes(filterG);
  const matchFilterProgram = (itemPrograms: string[], filterP: string) => filterP === "ทั้งหมด" || itemPrograms.includes(filterP);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      return matchFilterGrade(safeGetArray(exam.grade), filterGrade) && 
             matchFilterProgram(safeGetArray(exam.program), filterProgram) && 
             matchFilterSubject(exam.subject, filterSubject);
    });
  }, [exams, filterGrade, filterProgram, filterSubject]);

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      return matchFilterGrade(safeGetArray(l.grade), filterGrade) && 
             matchFilterProgram(safeGetArray(l.program), filterProgram) && 
             matchFilterSubject(l.subject, filterSubject);
    });
  }, [lessons, filterGrade, filterProgram, filterSubject]);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(ws => {
      return matchFilterGrade(safeGetArray(ws.grade), filterGrade) && 
             matchFilterProgram(safeGetArray(ws.program), filterProgram) && 
             matchFilterSubject(ws.subject, filterSubject);
    });
  }, [worksheets, filterGrade, filterProgram, filterSubject]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(searchStudent.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase()))
    );
  }, [students, searchStudent]);

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-bold text-slate-500">กำลังตรวจสอบสิทธิ์ Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 flex-col border-r bg-white p-6 md:flex shadow-sm">
        <div className="flex-1">
          <h2 className="mb-8 text-2xl font-black text-primary flex items-center gap-2">
            <BookOpen className="size-6" /> คลังสอบ Admin
          </h2>
          <nav className="flex flex-col space-y-1.5">
            <button onClick={() => setActiveTab("dashboard")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "dashboard" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><LayoutDashboard className="size-5" /> ภาพรวมระบบ</button>
            <button onClick={() => setActiveTab("analytics")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "analytics" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><PieChart className="size-5 text-rose-500" /> วิเคราะห์จุดอ่อนข้อสอบ</button>
            <button onClick={() => setActiveTab("exams")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "exams" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><BookOpen className="size-5" /> จัดการข้อสอบ</button>
            <button onClick={() => setActiveTab("trash_exams")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "trash_exams" ? "bg-amber-50 text-amber-700 shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><Trash2 className="size-5 text-amber-600" /> ถังขยะข้อสอบ ({trashExams.length})</button>
            <button onClick={() => setActiveTab("bulk_exam")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "bulk_exam" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><UploadCloud className="size-5" /> นำเข้าข้อสอบชุดใหญ่ (JSON)</button>
            <button onClick={() => setActiveTab("lessons")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "lessons" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><GraduationCap className="size-5" /> จัดการเนื้อหาบทเรียน</button>
            <button onClick={() => setActiveTab("worksheets")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "worksheets" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><FilePenLine className="size-5" /> จัดการแบบฝึกหัด</button>
            <button onClick={() => setActiveTab("users")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "users" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><Users className="size-5" /> จัดการผู้ใช้งาน & สิทธิ์</button>
            <button onClick={() => setActiveTab("codes")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "codes" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><Key className="size-5" /> รหัสปลดล็อกสิทธิ์</button>
            <button onClick={() => setActiveTab("reports")} className={`flex items-center gap-3 rounded-2xl p-3 font-bold transition-all ${activeTab === "reports" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><FileSpreadsheet className="size-5" /> สรุปผลสอบ (Submissions)</button>
          </nav>
        </div>
        
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl p-3 font-bold text-red-500 transition-colors hover:bg-red-50">
            <LogOut className="size-5" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 w-full overflow-x-hidden relative h-screen overflow-y-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {activeTab === "dashboard" && "Dashboard (ภาพรวมระบบ)"}
            {activeTab === "analytics" && "วิเคราะห์จุดอ่อนข้อสอบ & คำถามที่เด็กตอบผิดบ่อย"}
            {activeTab === "exams" && "จัดการชุดข้อสอบ"}
            {activeTab === "trash_exams" && "ถังขยะข้อสอบ (กู้คืน / ลบถาวร)"}
            {activeTab === "bulk_exam" && "นำเข้าชุดข้อสอบ (Bulk JSON Import)"}
            {activeTab === "lessons" && "จัดการเนื้อหาบทเรียน"}
            {activeTab === "worksheets" && "จัดการแบบฝึกหัด"}
            {activeTab === "users" && "จัดการผู้ใช้งาน & สิทธิ์การเข้าถึง"}
            {activeTab === "codes" && "จัดการรหัสปลดล็อกสิทธิ์ (Access Codes)"}
            {activeTab === "reports" && "รายงานผลการสอบล่าสุด (Exam Submissions)"}
          </h1>

          {activeTab === "exams" && (
            <button 
              onClick={() => { 
                setEditingExamId(null);
                setNewExamInfo({ title: "", grade: [filterGrade === "ทั้งหมด" ? "ป.6" : filterGrade], program: [filterProgram === "ทั้งหมด" ? "ISM" : filterProgram], subject: filterSubject === "ทั้งหมด" ? "คณิตศาสตร์" : filterSubject, year: "2567", is_timed: true, duration_minutes: 90, shuffle_questions: false });
                setExamModalMode("exam_info"); 
                setPreviewImages([]); 
                setManualQuestions([{ id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }]);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-white font-bold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> เพิ่มข้อสอบใหม่
            </button>
          )}

          {activeTab === "lessons" && (
            <button 
              onClick={() => {
                setLessonFormData({ id: 0, title: "", grade: [filterGrade === "ทั้งหมด" ? "ป.6" : filterGrade], program: [filterProgram === "ทั้งหมด" ? "ISM" : filterProgram], subject: filterSubject === "ทั้งหมด" ? "คณิตศาสตร์" : filterSubject, video_url: "", pdf_url: "", description: "" });
                setShowLessonModal(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-white font-bold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> เพิ่มบทเรียนใหม่
            </button>
          )}

          {activeTab === "worksheets" && (
            <button 
              onClick={() => setShowWorksheetModal(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-white font-bold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> เพิ่มแบบฝึกหัดใหม่
            </button>
          )}
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-4">
              <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">นักเรียนทั้งหมด</p><p className="mt-2 text-3xl font-black text-slate-800">{students.length} <span className="text-sm font-semibold text-slate-400">คน</span></p></div>
              <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">จำนวนข้อสอบ</p><p className="mt-2 text-3xl font-black text-slate-800">{exams.length} <span className="text-sm font-semibold text-slate-400">ชุด</span></p></div>
              <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">จำนวนบทเรียน</p><p className="mt-2 text-3xl font-black text-slate-800">{lessons.length} <span className="text-sm font-semibold text-slate-400">บทเรียน</span></p></div>
              <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">แบบฝึกหัด</p><p className="mt-2 text-3xl font-black text-slate-800">{worksheets.length} <span className="text-sm font-semibold text-slate-400">ชุด</span></p></div>
            </div>
          </div>
        )}

        {/* Tab: Analytics จุดอ่อนข้อสอบ */}
        {activeTab === "analytics" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase text-rose-600 tracking-wider">Mistake Inspector</span>
                <h2 className="text-xl font-black text-slate-900 mt-1">10 ข้อสอบที่มีนักเรียนตอบผิดมากที่สุดในระบบ</h2>
                <p className="text-xs text-slate-500 mt-1">ใช้สำหรับนำข้อเหล่านี้ไปเปิดติวเน้นย้ำในห้องเรียนสด หรือสร้างชุดข้อสอบแก้จุดบกพร่อง</p>
              </div>
              <TrendingDown className="size-12 text-rose-500 opacity-80" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 divide-y divide-slate-100">
                {hardestQuestionsStats.length > 0 ? (
                  hardestQuestionsStats.map((item, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-black text-xs">อันดับ {idx + 1}</span>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{item.subject}</span>
                          <span className="text-xs text-slate-400 font-semibold">{item.examTitle}</span>
                        </div>
                        <p className="font-bold text-slate-800 text-base leading-relaxed">{item.question}</p>
                      </div>
                      <div className="text-right shrink-0 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase text-rose-500">ตอบผิดสะสม</p>
                        <p className="text-xl font-black text-rose-700">{item.count} <span className="text-xs font-medium text-slate-500">ครั้ง</span></p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-400">ยังไม่มีสถิติข้อที่ทำผิดสะสม</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Lessons */}
        {activeTab === "lessons" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-3xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่บทเรียน</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : program === "ทั้งหมด" ? "ทั้งหมด" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">บทเรียน: {filterGrade} / {filterProgram} {filterSubject !== "ทั้งหมด" ? `/ ${filterSubject}` : ""}</h3>
                  <span className="text-xs font-semibold text-primary">พบ {filteredLessons.length} บทเรียนในหมวดนี้</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDeleteFilteredLessons} className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5">
                    <Trash2 className="size-3.5" /> ลบเฉพาะหมวดนี้
                  </button>
                  <button onClick={handleDeleteAllLessons} className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5">
                    <AlertOctagon className="size-3.5" /> ลบทั้งหมดในระบบ
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">ชื่อบทเรียน</th><th className="p-4 font-medium">วิชา</th><th className="p-4 font-medium">วิดีโอประกอบ</th><th className="p-4 font-medium">เอกสาร PDF</th><th className="p-4 font-medium">จัดการ</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLessons.length > 0 ? (
                      filteredLessons.map(lesson => (
                        <tr key={lesson.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-semibold text-slate-800">{lesson.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {safeGetArray(lesson.grade).map((g: string) => (<span key={g} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">{g}</span>))}
                              {safeGetArray(lesson.program).map((p: string) => (<span key={p} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">{p}</span>))}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{lesson.subject}</td>
                          <td className="p-4 text-slate-600">{lesson.video_url ? <a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1"><Video className="size-4" /> ดูคลิป</a> : "-"}</td>
                          <td className="p-4 text-slate-600">{lesson.pdf_url ? <a href={lesson.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1"><FileText className="size-4" /> เอกสาร</a> : "-"}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button onClick={() => { 
                                setLessonFormData({
                                  ...lesson,
                                  grade: safeGetArray(lesson.grade).length > 0 ? safeGetArray(lesson.grade) : ["ป.6"],
                                  program: safeGetArray(lesson.program).length > 0 ? safeGetArray(lesson.program) : ["ISM"]
                                }); 
                                setShowLessonModal(true); 
                              }} className="p-2 text-slate-400 hover:text-primary transition-colors border rounded-xl bg-white shadow-sm" title="แก้ไขบทเรียน"><Edit className="size-4"/></button>
                              <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors border rounded-xl bg-white shadow-sm" title="ลบบทเรียน"><Trash2 className="size-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400"><GraduationCap className="size-10 mx-auto mb-3 opacity-25" /><p>ยังไม่มีข้อมูลบทเรียนในหมวดหมู่นี้</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Exams */}
        {activeTab === "exams" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-3xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่ข้อสอบ</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : program === "ทั้งหมด" ? "ทั้งหมด" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">ข้อสอบ: {filterGrade} / {filterProgram} {filterSubject !== "ทั้งหมด" ? `/ ${filterSubject}` : ""}</h3>
                  <span className="text-xs font-semibold text-primary">พบ {filteredExams.length} รายการ</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDeleteFilteredExams} className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5">
                    <Trash2 className="size-3.5" /> ลบเฉพาะหมวดนี้
                  </button>
                  <button onClick={handleDeleteAllExams} className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5">
                    <AlertOctagon className="size-3.5" /> ลบทั้งหมดในระบบ
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr>
                      <th className="p-4 font-medium">ชื่อชุดข้อสอบ</th>
                      <th className="p-4 font-medium">รายวิชา</th>
                      <th className="p-4 font-medium">ปีการศึกษา</th>
                      <th className="p-4 font-medium text-center">เวลาสอบ (นาที)</th>
                      <th className="p-4 font-medium text-center">สลับข้อ</th>
                      <th className="p-4 font-medium text-center">จำนวนข้อ</th>
                      <th className="p-4 font-medium">สถานะ</th>
                      <th className="p-4 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredExams.length > 0 ? (
                      filteredExams.map(exam => (
                        <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-semibold text-slate-800">{exam.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {safeGetArray(exam.grade).map((g: string) => (<span key={g} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">{g}</span>))}
                              {safeGetArray(exam.program).map((p: string) => (<span key={p} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">{p}</span>))}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{exam.subject}</td>
                          <td className="p-4 text-slate-600">{exam.year}</td>
                          
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleQuickUpdateExamDuration(exam)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1 ${
                                exam.is_timed === false
                                  ? "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400"
                                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              }`}
                              title="คลิกเพื่อแก้ไขเวลาสอบชุดนี้"
                            >
                              <Clock className="size-3 text-blue-600" />
                              <span>{exam.is_timed === false ? "ไม่จำกัดเวลา" : `${exam.duration_minutes || 90} นาที`}</span>
                            </button>
                          </td>

                          <td className="p-4 text-slate-600 text-center">
                            {exam.shuffle_questions ? <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded border border-teal-200">เปิดสลับ</span> : "-"}
                          </td>
                          <td className="p-4 text-slate-600 text-center font-medium bg-slate-50/50">{exam.total_questions || exam.questions?.length || 0}</td>
                          <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${exam.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{exam.status === 'published' ? 'พร้อมใช้งาน' : 'ฉบับร่าง'}</span></td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => handleExportWord(exam, false)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors border rounded-xl bg-white shadow-sm" title="Export Word (ฉบับนักเรียน)"><FileDown className="size-4"/></button>
                              <button onClick={() => handleExportWord(exam, true)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors border rounded-xl bg-white shadow-sm" title="Export Word (ฉบับครู พร้อมเฉลย)"><Download className="size-4"/></button>
                              <button onClick={() => handleDuplicateExam(exam)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors border rounded-xl bg-white shadow-sm" title="คัดลอกชุดข้อสอบนี้"><Copy className="size-4"/></button>
                              <button onClick={() => handleOpenEditExam(exam)} className="p-2 text-slate-400 hover:text-primary transition-colors border rounded-xl bg-white shadow-sm" title="แก้ไขข้อสอบ"><Edit className="size-4"/></button>
                              <button onClick={() => handleSoftDeleteExam(exam.id)} className="p-2 text-slate-400 hover:text-amber-600 transition-colors border rounded-xl bg-white shadow-sm" title="ย้ายเข้าถังขยะ"><Trash2 className="size-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={8} className="p-12 text-center text-slate-400"><BookOpen className="size-10 mx-auto mb-3 opacity-25" /><p>ยังไม่มีข้อมูลข้อสอบในหมวดหมู่นี้</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: ถังขยะข้อสอบ */}
        {activeTab === "trash_exams" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-amber-50/50 p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-amber-900">ถังขยะข้อสอบ ({trashExams.length} ชุด)</h3>
                <span className="text-xs text-amber-700 font-bold">สามารถกดกู้คืน หรือลบถาวรได้</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">ชื่อชุดข้อสอบ</th><th className="p-4 font-medium">วิชา</th><th className="p-4 font-medium">ปี</th><th className="p-4 font-medium text-right pr-6">การจัดการ</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {trashExams.length > 0 ? (
                      trashExams.map(exam => (
                        <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{exam.title}</td>
                          <td className="p-4 text-slate-600">{exam.subject}</td>
                          <td className="p-4 text-slate-600">{exam.year}</td>
                          <td className="p-4 text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleRestoreExam(exam.id)} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm">
                                <RotateCcw className="size-3.5"/> กู้คืนข้อสอบ
                              </button>
                              <button onClick={() => handlePermanentDeleteExam(exam.id)} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm">
                                <Trash2 className="size-3.5"/> ลบถาวร
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400">ไม่มีข้อสอบในถังขยะ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Bulk Exam JSON Import */}
        {activeTab === "bulk_exam" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              <div className="md:col-span-4 space-y-4">
                <h3 className="font-bold text-base text-slate-800 border-b pb-3">1. กำหนดรายละเอียดชุดข้อสอบ</h3>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อชุดข้อสอบ</label>
                  <input
                    type="text"
                    placeholder="เช่น ข้อสอบแข่งขันวิทยาศาสตร์ ป.6"
                    value={bulkExamForm.title}
                    onChange={(e) => setBulkExamForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">วิชา</label>
                    <select
                      value={bulkExamForm.subject}
                      onChange={(e) => setBulkExamForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-primary bg-white"
                    >
                      <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                      <option value="วิทยาศาสตร์">วิทยาศาสตร์</option>
                      <option value="ภาษาอังกฤษ">ภาษาอังกฤษ</option>
                      <option value="ภาษาไทย">ภาษาไทย</option>
                      <option value="สังคมศึกษา">สังคมศึกษา</option>
                      <option value="ความถนัดทางคณิตศาสตร์">ความถนัดทางคณิตศาสตร์</option>
                      <option value="ทักษะภาษาอังกฤษ">ทักษะภาษาอังกฤษ</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">ปีการศึกษา</label>
                    <input
                      type="text"
                      value={bulkExamForm.year}
                      onChange={(e) => setBulkExamForm(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น</label>
                    <div className="flex flex-wrap gap-2">
                      {["ป.4", "ป.5", "ป.6"].map(g => (
                        <button 
                          key={g} 
                          type="button" 
                          onClick={() => setBulkExamForm(prev => ({
                            ...prev, 
                            grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                          }))} 
                          className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${bulkExamForm.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน</label>
                    <div className="flex flex-wrap gap-2">
                      {["ISM", "EP", "ภาคปกติ"].map(p => (
                        <button 
                          key={p} 
                          type="button" 
                          onClick={() => setBulkExamForm(prev => ({
                            ...prev, 
                            program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                          }))} 
                          className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${bulkExamForm.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">เวลาสอบ (นาที)</label>
                    <input
                      type="number"
                      value={bulkExamForm.duration_minutes}
                      onChange={(e) => setBulkExamForm(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none"
                    />
                  </div>
                  <div className="pt-4">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkExamForm.shuffle_questions}
                        onChange={(e) => setBulkExamForm(prev => ({ ...prev, shuffle_questions: e.target.checked }))}
                        className="size-4 text-primary rounded"
                      />
                      <span>เปิดระบบสลับช้อยส์</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-base text-slate-800">2. วางโครงสร้าง JSON ของคำถาม</h3>
                  <button
                    type="button"
                    onClick={loadSampleJson}
                    className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="size-3.5" /> โหลดตัวอย่าง JSON (Template)
                  </button>
                </div>

                <textarea
                  rows={13}
                  value={rawQuestionsJson}
                  onChange={(e) => setRawQuestionsJson(e.target.value)}
                  placeholder={`[\n  {\n    "type": "choice",\n    "question": "คำถาม...",\n    "options": ["ก", "ข", "ค", "ง"],\n    "correct_index": 0,\n    "explanation": "คำอธิบาย..."\n  }\n]`}
                  className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-primary custom-scrollbar leading-relaxed"
                />

                {bulkImportStatus && (
                  <div className="p-4 rounded-xl bg-slate-100 border text-xs font-bold text-slate-700">
                    {bulkImportStatus}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBulkImportExam}
                  disabled={isBulkImporting || !rawQuestionsJson.trim()}
                  className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBulkImporting ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  นำเข้าข้อสอบชุดนี้ทันที
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: Worksheets */}
        {activeTab === "worksheets" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-3xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่แบบฝึกหัด</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : program === "ทั้งหมด" ? "ทั้งหมด" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">รายการแบบฝึกหัด</h3>
                  <span className="text-xs font-semibold text-primary">พบ {filteredWorksheets.length} รายการ</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDeleteFilteredWorksheets} className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5">
                    <Trash2 className="size-3.5" /> ลบเฉพาะหมวดนี้
                  </button>
                  <button onClick={handleDeleteAllWorksheets} className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5">
                    <AlertOctagon className="size-3.5" /> ลบทั้งหมดในระบบ
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">ชื่อชุดแบบฝึกหัด</th><th className="p-4 font-medium">วิชา</th><th className="p-4 font-medium">จำนวนหน้า</th><th className="p-4 font-medium">จัดการ</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredWorksheets.length > 0 ? (
                      filteredWorksheets.map(ws => (
                        <tr key={ws.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-semibold text-slate-800">
                            {ws.title}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {safeGetArray(ws.grade).map((g: string) => (<span key={g} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">{g}</span>))}
                              {safeGetArray(ws.program).map((p: string) => (<span key={p} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">{p}</span>))}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{ws.subject}</td>
                          <td className="p-4 text-slate-600">{ws.pages?.length || 0} หน้า</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleDuplicateWorksheet(ws)} className="p-2 text-slate-400 hover:text-indigo-600 border rounded-xl bg-white shadow-sm" title="คัดลอกแบบฝึกหัดนี้"><Copy className="size-4"/></button>
                              <button onClick={() => handleDeleteWorksheet(ws.id)} className="p-2 text-slate-400 hover:text-red-500 border rounded-xl bg-white shadow-sm" title="ลบแบบฝึกหัด"><Trash2 className="size-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400">ยังไม่มีข้อมูลแบบฝึกหัดในหมวดหมู่นี้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Users & Permissions */}
        {activeTab === "users" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <span className="font-bold text-slate-800 text-sm">การจัดการนักเรียนทั้งหมด ({students.length} คน)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className={`px-3.5 py-2 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${isImporting ? "opacity-50" : ""}`}>
                  {isImporting ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                  {isImporting ? "กำลังนำเข้า..." : "นำเข้าด้วย CSV"}
                  <input type="file" accept=".csv" className="hidden" disabled={isImporting} onChange={handleImportCSV} />
                </label>
                <button onClick={handleExportCSV} className="px-3.5 py-2 rounded-2xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <Download className="size-3.5" /> ส่งออก Excel (CSV)
                </button>
                <button onClick={handleResetAllStudentsData} className="px-3.5 py-2 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <RefreshCw className="size-3.5" /> รีเซ็ตผลสอบทุกคน
                </button>
                <button onClick={handleDeleteAllStudents} className="px-3.5 py-2 rounded-2xl border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <AlertOctagon className="size-3.5" /> ลบนักเรียนทุกคน
                </button>
              </div>
            </div>

            {/* Quick Permissions Checkbox Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <div className="relative w-full sm:w-80">
                  <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือ อีเมลนักเรียน..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleOpenAddStudent} className="flex items-center gap-1.5 text-xs bg-primary text-white px-3.5 py-2 rounded-2xl font-bold hover:bg-primary/90 transition shadow-sm">
                    <PlusCircle className="size-4" /> สร้างบัญชีใหม่
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">นักเรียน</th>
                      <th className="p-4 text-center">สถานะ</th>
                      <th className="p-4 text-center">ป.4</th>
                      <th className="p-4 text-center">ป.5</th>
                      <th className="p-4 text-center">ป.6</th>
                      <th className="p-4 text-center">ISM</th>
                      <th className="p-4 text-center">EP</th>
                      <th className="p-4 text-center">ภาคปกติ</th>
                      <th className="p-4 text-right pr-6">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredStudents.map((s) => {
                      const perms = s.permissions || {};
                      const isSaving = savingStudentId === s.id;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4 pl-6">
                            <p className="font-bold text-slate-800">{s.name || "ไม่ระบุชื่อ"}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {s.is_active !== false ? "ปกติ" : "ระงับ"}
                            </span>
                          </td>

                          {["ป.4", "ป.5", "ป.6", "ISM", "EP", "ภาคปกติ"].map((key) => (
                            <td key={key} className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleQuickToggleStudentPermission(s.id, key)}
                                className={`size-7 rounded-lg border flex items-center justify-center transition-all mx-auto ${
                                  perms[key]
                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                                    : "bg-slate-100 border-slate-200 text-slate-300 hover:border-slate-300"
                                }`}
                              >
                                {perms[key] ? <CheckCircle2 className="size-4" /> : <X className="size-3" />}
                              </button>
                            </td>
                          ))}

                          <td className="p-4 text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleQuickSaveStudentPermission(s)}
                                disabled={isSaving}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1"
                                title="บันทึกสิทธิ์"
                              >
                                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                                บันทึก
                              </button>
                              <button
                                onClick={() => handleForceResetPassword(s)}
                                className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs hover:bg-amber-100"
                                title="Reset รหัสผ่านเป็น 12345678"
                              >
                                <Key className="size-3.5"/>
                              </button>
                              <button
                                onClick={() => handleToggleStudentActive(s)}
                                className={`p-1.5 rounded-xl border text-xs ${s.is_active !== false ? "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100" : "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}
                                title={s.is_active !== false ? "ระงับบัญชี" : "ปลดระงับ"}
                              >
                                <ShieldAlert className="size-3.5"/>
                              </button>
                              <button onClick={() => handleOpenEditStudent(s)} className="p-1.5 text-slate-400 hover:text-primary border rounded-xl bg-white shadow-sm" title="แก้ไขโปรไฟล์"><Edit className="size-3.5"/></button>
                              <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 border rounded-xl bg-white shadow-sm" title="ลบบัญชี"><Trash2 className="size-3.5"/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Student Dashboard View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 rounded-3xl border bg-white shadow-sm p-5 flex flex-col h-[60vh]">
                <h3 className="font-bold text-base text-slate-800 mb-3">เลือกลูกศิษย์เพื่อดูคะแนนละเอียด</h3>
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {students.map((student) => (
                    <div key={student.id} onClick={() => setSelectedStudent(student)} className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <div className={`p-2.5 rounded-2xl ${selectedStudent?.id === student.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}><Users className="size-5"/></div>
                      <div>
                        <p className={`font-bold text-sm ${selectedStudent?.id === student.id ? 'text-primary' : 'text-slate-800'}`}>{student.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudent ? (
                <div className="lg:col-span-8 rounded-3xl border bg-white shadow-sm p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><BarChart3 className="size-5 text-primary"/> ผลการเรียนรายบุคคล</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleResetStudentData(selectedStudent)} className="p-2 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-2xl transition-colors border shadow-sm" title="รีเซ็ตผลสอบคนนี้"><RefreshCw className="size-4"/></button>
                      <button onClick={() => handleOpenEditStudent(selectedStudent)} className="p-2 text-slate-500 hover:text-primary bg-slate-50 hover:bg-primary/10 rounded-2xl transition-colors border shadow-sm" title="แก้ไขข้อมูลและสิทธิ์"><Edit className="size-4"/></button>
                      <button onClick={() => handleDeleteStudent(selectedStudent.id)} className="p-2 text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-2xl transition-colors border shadow-sm" title="ลบนักเรียนคนนี้"><Trash2 className="size-4"/></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                    <p className="text-2xl font-black text-slate-800">{selectedStudent.name}</p>
                    <p className="text-xs sm:text-sm text-slate-500">{selectedStudent.email} • {selectedStudent.phone || "ไม่ระบุเบอร์โทร"}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2"><History className="size-4 text-slate-500"/> ประวัติการทำข้อสอบ</h4>
                      <span className="text-xs font-semibold bg-white border px-2.5 py-1 rounded-xl text-slate-500">{selectedStudent.examHistory?.length || 0} รายการ</span>
                    </div>

                    {selectedStudent.examHistory && selectedStudent.examHistory.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {[...selectedStudent.examHistory].reverse().map((h: any) => (
                           <div key={h.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm group">
                             <div>
                               <p className="font-bold text-sm text-slate-800">{h.title}</p>
                               <div className="flex items-center gap-3 mt-1.5">
                                 <p className="text-xs text-slate-500">{h.date}</p>
                                 <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                                   คะแนน: {h.score}/{h.total}
                                 </p>
                               </div>
                             </div>
                             <button 
                               onClick={() => handleDeleteStudentHistory(selectedStudent, h.id, h.exam_id)} 
                               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent group-hover:border-red-100"
                               title="ลบประวัติชุดนี้"
                             >
                               <Trash2 className="size-4"/>
                             </button>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-400 bg-white rounded-2xl border border-dashed">
                        <History className="size-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">ยังไม่มีประวัติการทำข้อสอบ</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Tab 6: Access Codes */}
        {activeTab === "codes" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Key className="size-5 text-primary" /> สร้างรหัสปลดล็อกสิทธิ์ใหม่ (Access Code)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ชื่อรหัสโค้ด</label>
                  <input
                    type="text"
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    placeholder="เช่น ISM2026, VIPPASS"
                    className="w-full p-3 border rounded-2xl text-sm font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="sm:col-span-8 flex flex-col justify-end">
                  <button
                    onClick={handleCreateAccessCode}
                    className="py-3 px-6 bg-primary text-white font-bold rounded-2xl shadow-sm hover:bg-primary/90 transition text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="size-4" /> สร้างรหัสโค้ด
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4">
                <h3 className="font-bold text-lg text-slate-800">รายการรหัสโค้ดที่มีในระบบ</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">รหัสโค้ด</th><th className="p-4 font-medium">สิทธิ์ที่ได้รับ</th><th className="p-4 font-medium">จัดการ</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {accessCodes.length > 0 ? (
                      accessCodes.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono font-black text-primary text-base">{c.code}</td>
                          <td className="p-4 text-xs font-semibold text-slate-600">
                            {getActivePermissionsText(c.permissions, ["ป.4", "ป.5", "ป.6", "ISM", "EP", "ภาคปกติ"])}
                          </td>
                          <td className="p-4">
                            <button onClick={() => handleDeleteAccessCode(c.id)} className="p-2 text-slate-400 hover:text-red-500 border rounded-xl bg-white shadow-sm" title="ลบรหัสนี้"><Trash2 className="size-4"/></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-12 text-center text-slate-400">ยังไม่มีรหัสโค้ดในระบบ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Reports (Submissions) */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800">รายการส่งข้อสอบ 200 รายการล่าสุด</h3>
              <button
                onClick={handleExportSubmissionsCSV}
                className="text-xs text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition shadow-sm"
              >
                <Download className="size-4" /> ดาวน์โหลดทั้งหมดเป็น CSV (Excel)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">นักเรียน</th>
                    <th className="p-4">วิชา / แผนการเรียน</th>
                    <th className="p-4 text-center">คะแนน</th>
                    <th className="p-4 text-center">คิดเป็น</th>
                    <th className="p-4 text-right pr-6">วันที่สอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-800">{sub.student_name}</td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-700">{sub.subject}</span>
                        <span className="text-xs text-slate-400 block">{sub.program} ({sub.year})</span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">{sub.score} / {sub.total}</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary">
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6 text-xs text-slate-400">
                        {new Date(sub.created_at).toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add/Edit Lesson */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">{lessonFormData.id ? "แก้ไขบทเรียน" : "เพิ่มบทเรียนใหม่"}</h2>
              <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:bg-slate-100 rounded-full p-1.5"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อบทเรียน</label>
                <input type="text" required value={lessonFormData.title} onChange={e => setLessonFormData({ ...lessonFormData, title: e.target.value })} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="เช่น บทที่ 1 เศษส่วนและทศนิยม" />
              </div>
              
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น</label>
                  <div className="flex flex-wrap gap-2">
                    {["ป.4", "ป.5", "ป.6"].map(g => (
                      <button 
                        key={g} 
                        type="button" 
                        onClick={() => setLessonFormData(prev => ({
                          ...prev, 
                          grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                        }))} 
                        className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all ${lessonFormData.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน</label>
                  <div className="flex flex-wrap gap-2">
                    {["ISM", "EP", "ภาคปกติ"].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setLessonFormData(prev => ({
                          ...prev, 
                          program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                        }))} 
                        className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all ${lessonFormData.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">วิชา</label>
                <select value={lessonFormData.subject} onChange={e => setLessonFormData({ ...lessonFormData, subject: e.target.value })} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white font-medium">
                  <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                </select>
              </div>

              <div><label className="block text-sm font-bold text-slate-700 mb-1">ลิงก์วิดีโอการสอน (YouTube/Drive)</label><input type="url" value={lessonFormData.video_url} onChange={e => setLessonFormData({ ...lessonFormData, video_url: e.target.value })} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="https://youtube.com/..." /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">ลิงก์เอกสารประกอบการเรียน (PDF)</label><input type="url" value={lessonFormData.pdf_url} onChange={e => setLessonFormData({ ...lessonFormData, pdf_url: e.target.value })} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="https://drive.google.com/..." /></div>
              
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowLessonModal(false)} className="flex-1 py-3.5 border rounded-2xl font-bold">ยกเลิก</button><button type="submit" className="flex-1 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90">บันทึกบทเรียน</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Worksheet */}
      {showWorksheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">เพิ่มแบบฝึกหัดใหม่</h2>
              <button onClick={() => setShowWorksheetModal(false)} className="text-slate-400 hover:bg-slate-100 rounded-full p-1.5"><X className="size-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อชุดแบบฝึกหัด</label>
                <input type="text" value={worksheetFormData.title} onChange={e => setWorksheetFormData({ ...worksheetFormData, title: e.target.value })} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="เช่น แบบฝึกหัดคณิตศาสตร์ บทที่ 1" />
              </div>
              
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น</label>
                  <div className="flex flex-wrap gap-2">
                    {["ป.4", "ป.5", "ป.6"].map(g => (
                      <button 
                        key={g} 
                        type="button" 
                        onClick={() => setWorksheetFormData(prev => ({
                          ...prev, 
                          grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                        }))} 
                        className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all ${worksheetFormData.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน</label>
                  <div className="flex flex-wrap gap-2">
                    {["ISM", "EP", "ภาคปกติ"].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setWorksheetFormData(prev => ({
                          ...prev, 
                          program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                        }))} 
                        className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all ${worksheetFormData.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">วิชา</label>
                <select value={worksheetFormData.subject} onChange={e => setWorksheetFormData({ ...worksheetFormData, subject: e.target.value })} className="w-full p-3 border rounded-2xl text-sm bg-white font-medium">
                  <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">อัปโหลดรูปภาพแบบฝึกหัด (เลือกได้หลายหน้า)</label>
                <input type="file" accept="image/*" multiple onChange={handleUploadWorksheetImages} disabled={isUploading} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 cursor-pointer" />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 className="size-6 animate-spin text-primary mb-2" />
                    <span className="text-xs font-bold text-primary">กำลังอัปโหลดรูปภาพ...</span>
                  </div>
                )}
                
                {!isUploading && worksheetFormData.pages.length > 0 && (
                  <p className="mt-3 text-xs font-bold text-emerald-600">อัปโหลดเข้า Storage สำเร็จแล้ว {worksheetFormData.pages.length} หน้า</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowWorksheetModal(false)} className="flex-1 py-3.5 border rounded-2xl font-bold">ยกเลิก</button>
                <button onClick={handleSaveWorksheet} disabled={isUploading} className="flex-1 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-50">บันทึกเข้าสู่ระบบ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Student Form */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-3 z-10 border-b">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? "แก้ไขข้อมูลและสิทธิ์นักเรียน" : "เพิ่มนักเรียนใหม่ (สร้างบัญชี)"}
              </h2>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1.5 transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="space-y-6">
              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="size-3.5" /> บัญชีผู้ใช้งาน (Login Credentials)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">อีเมล (Username)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="email@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isEditing ? "ตั้งรหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "รหัสผ่าน (Password)"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                      <input type="password" required={!isEditing} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm" placeholder="ด.ช. / ด.ญ. ..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm" placeholder="08X-XXX-XXXX" />
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Unlock className="size-4 text-slate-500" /> สิทธิ์การเข้าถึงเนื้อหาข้อสอบ (Access Permissions)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ระดับชั้น</p>
                    {["ป.4", "ป.5", "ป.6"].map(grade => {
                      const isChecked = !!formData.permissions?.[grade as keyof typeof formData.permissions];
                      return (
                        <label key={grade} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-white border-primary shadow-sm' : 'bg-slate-100/70 border-slate-200 hover:bg-white'}`}>
                          <span className={`text-sm font-semibold ${isChecked ? 'text-primary' : 'text-slate-600'}`}>{grade}</span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isChecked ? 'bg-primary' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                          <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleTogglePermission(grade)} />
                        </label>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">แผนการเรียน</p>
                    {["ISM", "EP", "ภาคปกติ"].map(program => {
                      const isChecked = !!formData.permissions?.[program as keyof typeof formData.permissions];
                      return (
                        <label key={program} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-white border-primary shadow-sm' : 'bg-slate-100/70 border-slate-200 hover:bg-white'}`}>
                          <span className={`text-sm font-semibold ${isChecked ? 'text-primary' : 'text-slate-600'}`}>{program}</span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isChecked ? 'bg-primary' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                          <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleTogglePermission(program)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 py-3.5 rounded-2xl border font-bold text-slate-600 hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 shadow-md"><Save className="size-4"/> บันทึกข้อมูลและสิทธิ์</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exam Info */}
      {examModalMode === "exam_info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">{editingExamId ? "แก้ไขข้อมูลชุดข้อสอบ" : "1. ข้อมูลชุดข้อสอบ"}</h2>
              <button onClick={() => setExamModalMode("none")} className="p-1"><X className="size-5" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อชุดข้อสอบ</label>
                <input type="text" value={newExamInfo.title} onChange={e => setNewExamInfo({...newExamInfo, title: e.target.value})} className="w-full p-3.5 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm font-semibold" placeholder="เช่น ตะลุยโจทย์เรขาคณิตเข้า ม.1 (ชุดที่ 1)"/>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น</label>
                  <div className="flex flex-wrap gap-2">
                    {["ป.4", "ป.5", "ป.6"].map(g => (
                      <button 
                        key={g} 
                        type="button" 
                        onClick={() => setNewExamInfo(prev => ({
                          ...prev, 
                          grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                        }))} 
                        className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${newExamInfo.grade.includes(g) ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน</label>
                  <div className="flex flex-wrap gap-2">
                    {["ISM", "EP", "ภาคปกติ"].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setNewExamInfo(prev => ({
                          ...prev, 
                          program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                        }))} 
                        className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${newExamInfo.program.includes(p) ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">ระบบจับเวลาสอบ</label>
                  <button
                    type="button"
                    onClick={() => setNewExamInfo(prev => ({ ...prev, is_timed: !prev.is_timed }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      newExamInfo.is_timed ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-300"
                    }`}
                  >
                    {newExamInfo.is_timed ? "เปิดใช้งาน (จับเวลา)" : "ปิดใช้งาน (ไม่จำกัดเวลา)"}
                  </button>
                </div>

                {newExamInfo.is_timed && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600">ระยะเวลาสอบ:</label>
                    <input
                      type="number"
                      min="1"
                      value={newExamInfo.duration_minutes}
                      onChange={e => setNewExamInfo(prev => ({ ...prev, duration_minutes: Number(e.target.value) || 60 }))}
                      className="w-24 p-2.5 border rounded-xl text-sm bg-white text-center font-bold"
                    />
                    <span className="text-xs font-bold text-slate-500">นาที</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Shuffle className="size-3.5 text-primary" /> สลับข้อสอบและตัวเลือกอัตโนมัติ
                  </label>
                  <input
                    type="checkbox"
                    checked={newExamInfo.shuffle_questions}
                    onChange={e => setNewExamInfo(prev => ({ ...prev, shuffle_questions: e.target.checked }))}
                    className="size-4 text-primary rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">รายวิชา</label>
                  <select value={newExamInfo.subject} onChange={e => setNewExamInfo({...newExamInfo, subject: e.target.value})} className="w-full p-3.5 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white font-medium">
                    <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ปีการศึกษา</label>
                  <input type="text" value={newExamInfo.year} onChange={e => setNewExamInfo({...newExamInfo, year: e.target.value})} className="w-full p-3.5 border rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 text-sm font-bold" />
                </div>
              </div>
              <button onClick={() => setExamModalMode("select")} className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-2 shadow-md hover:bg-primary/90 transition-transform active:scale-[0.98]">
                ถัดไป: จัดการข้อคำถาม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Select Add Question Method */}
      {examModalMode === "select" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl animate-in fade-in slide-in-from-right-4">
            <div className="flex gap-3 mb-6 border-b pb-4"><button onClick={() => setExamModalMode("exam_info")} className="p-2"><ChevronLeft/></button><div><h2 className="text-xl font-bold text-slate-800">2. นำเข้าข้อคำถาม</h2><p className="text-xs text-slate-500">{newExamInfo.title}</p></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <button onClick={() => setExamModalMode("ai")} className="flex flex-col items-center gap-4 rounded-3xl border-2 border-primary/30 bg-primary/5 p-8 hover:bg-primary/10 transition"><Sparkles className="size-10 text-primary" /><p className="font-bold text-primary text-sm text-center">สแกนภาพข้อสอบ (AI OCR + เฉลยวิธีทำ)</p></button>
              <button onClick={() => setExamModalMode("manual")} className="flex flex-col items-center gap-4 rounded-3xl border-2 border-slate-200 p-8 hover:bg-slate-50 transition"><FileText className="size-10 text-slate-500" /><p className="font-bold text-slate-700 text-sm text-center">พิมพ์ข้อสอบเอง (ปรนัย/อัตนัย/เฉลย)</p></button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Questions Editor */}
      {examModalMode === "manual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-7 shadow-2xl animate-in fade-in">
            <div className="flex flex-col border-b pb-4 mb-4 gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {!editingExamId && <button onClick={() => setExamModalMode("select")} className="p-1.5 hover:bg-slate-100 rounded-xl mt-1"><ChevronLeft/></button>}
                  <div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">{editingExamId ? `แก้ไขชุดข้อสอบ: ${newExamInfo.title}` : "สร้างข้อสอบแบบ Manual"} ({manualQuestions.length} ข้อ)</h2>
                    
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 w-fit">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">ชั้นปี:</span>
                        <div className="flex gap-1.5">
                          {["ป.4", "ป.5", "ป.6"].map(g => (
                            <button 
                              key={g} type="button" 
                              onClick={() => setNewExamInfo(prev => ({ ...prev, grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g] }))} 
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${newExamInfo.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                            >{g}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">แผน:</span>
                        <div className="flex gap-1.5">
                          {["ISM", "EP", "ภาคปกติ"].map(p => (
                            <button 
                              key={p} type="button" 
                              onClick={() => setNewExamInfo(prev => ({ ...prev, program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p] }))} 
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${newExamInfo.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                            >{p}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-l pl-3">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Timer className="size-3.5 text-primary" /> เวลาสอบ:
                        </span>
                        <input 
                          type="number"
                          min="1"
                          value={newExamInfo.duration_minutes}
                          onChange={e => setNewExamInfo(prev => ({ ...prev, duration_minutes: Number(e.target.value) || 60 }))}
                          className="w-16 p-1 border rounded-lg text-xs bg-white text-center font-bold outline-none"
                        />
                        <span className="text-xs font-bold text-slate-600">นาที</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setExamModalMode("none"); setEditingExamId(null); }} className="p-2 hover:bg-slate-100 rounded-full shrink-0"><X className="size-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {manualQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className={`border-2 rounded-3xl p-5 bg-white shadow-sm relative space-y-4 transition-all ${q.image_url === "NEEDS_IMAGE" ? "border-red-400 bg-red-50/30" : "border-slate-200"}`}>
                  
                  {q.image_url === "NEEDS_IMAGE" && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3.5 py-2 rounded-xl text-xs font-bold mb-2">
                      <AlertTriangle className="size-4 shrink-0" /> 
                      AI แจ้งว่าข้อนี้มีรูปภาพประกอบ (เช่น รูปเรขาคณิต) กรุณาแคปรูปแล้วอัปโหลดในช่องด้านล่าง!
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary text-base">ข้อที่ {qIdx + 1}</span>
                      <div className="inline-flex rounded-2xl bg-slate-100 p-1 border">
                        <button
                          type="button"
                          onClick={() => toggleQuestionType(qIdx, "choice")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${q.type === "choice" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          <CheckSquare className="size-3.5" /> ปรนัย (ช้อยส์)
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleQuestionType(qIdx, "subjective")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${q.type === "subjective" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          <AlignLeft className="size-3.5" /> อัตนัย (เขียนตอบ)
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeManualQuestion(qIdx)} className="text-slate-400 hover:text-red-500 p-1 self-end sm:self-auto"><Trash2 className="size-4" /></button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600">โจทย์คำถาม</label>
                      <label className="text-[10px] sm:text-xs flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition shadow-sm border border-indigo-200">
                        {scanningQIndex === qIdx ? <Loader2 className="size-3 animate-spin"/> : <Sparkles className="size-3"/>}
                        {scanningQIndex === qIdx ? "กำลังแกะโจทย์..." : "📷 อัปโหลดรูปเพื่อแกะข้อนี้ใหม่"}
                        <input type="file" accept="image/*" className="hidden" disabled={scanningQIndex === qIdx} onChange={(e) => handleScanSingleQuestion(qIdx, e)} />
                      </label>
                    </div>
                    <textarea 
                      rows={4}
                      value={q.question}
                      onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                      placeholder="พิมพ์ข้อความโจทย์คำถามที่นี่..."
                      className="w-full p-4 border rounded-2xl text-base focus:ring-2 focus:ring-primary/20 outline-none font-medium whitespace-pre-line leading-relaxed"
                    />
                  </div>

                  <div className={`p-4 rounded-2xl border relative ${q.image_url === "NEEDS_IMAGE" ? "bg-red-50 border-red-200 border-dashed" : "bg-slate-50 border-slate-200"}`}>
                    <label className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${q.image_url === "NEEDS_IMAGE" ? "text-red-600" : "text-slate-600"}`}>
                      <ImageIcon className={`size-4 ${q.image_url === "NEEDS_IMAGE" ? "text-red-500" : "text-primary"}`} /> รูปภาพประกอบโจทย์
                    </label>
                    {q.image_url && q.image_url !== "NEEDS_IMAGE" ? (
                      <div className="relative inline-block border rounded-2xl overflow-hidden bg-white shadow-sm">
                        <img src={q.image_url} alt="Question Attachment" className="max-h-48 object-contain" />
                        <button onClick={() => removeQuestionImage(qIdx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow"><X className="size-3.5" /></button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed rounded-2xl hover:bg-slate-100 text-xs w-fit ${isUploading ? "cursor-wait opacity-50" : "cursor-pointer"} ${q.image_url === "NEEDS_IMAGE" ? "border-red-400 text-red-600 shadow-sm shadow-red-100" : "border-slate-300 text-slate-600"}`}>
                        {isUploading ? <Loader2 className="size-4 animate-spin text-primary" /> : <UploadCloud className={`size-4 ${q.image_url === "NEEDS_IMAGE" ? "text-red-500" : "text-primary"}`} />}
                        {isUploading ? "กำลังอัปโหลด..." : q.image_url === "NEEDS_IMAGE" ? "คลิกอัปโหลดรูปภาพด่วน!" : "อัปโหลดรูปภาพโจทย์"}
                        <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => updateQuestionImage(qIdx, e)} />
                      </label>
                    )}
                  </div>

                  {q.type === "choice" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600">ตัวเลือกช้อยส์ ({q.options.length}/5) - ติ๊กวงกลมเพื่อเลือกข้อที่ถูกต้อง</label>
                        {q.options.length < 5 && (
                          <button type="button" onClick={() => addOptionToQuestion(qIdx)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                            <Plus className="size-3.5" /> เพิ่มช้อยส์
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => setCorrectOption(qIdx, optIdx)} 
                              className={`p-2 rounded-xl border transition-all ${q.correct_index === optIdx ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white text-slate-300 border-slate-300 hover:border-slate-400"}`}
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                            <span className="font-bold text-sm text-slate-600 w-6">{choiceLabels[optIdx] || `${optIdx + 1}.`}</span>
                            <input 
                              type="text" 
                              value={opt}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                              className="flex-1 p-3 border rounded-2xl text-sm outline-none focus:border-primary font-medium"
                            />
                            {q.options.length > 2 && (
                              <button type="button" onClick={() => removeOptionFromQuestion(qIdx, optIdx)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="size-4"/></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === "subjective" && (
                    <div className="space-y-3 pt-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <AlignLeft className="size-4 text-amber-600" /> ช่องคำตอบแบบอัตนัย ({(q.subjective_answers || []).length} ช่อง)
                          </label>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => addSubjectiveAnswerLine(qIdx)} 
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition"
                        >
                          <Plus className="size-3.5" /> เพิ่มช่องบรรทัด
                        </button>
                      </div>

                      <div className="space-y-2.5 mt-2">
                        {(q.subjective_answers || [""]).map((ans, lineIdx) => (
                          <div key={lineIdx} className="flex items-center gap-2">
                            <span className="font-bold text-xs text-amber-800 w-16">ช่องที่ {lineIdx + 1}:</span>
                            <input 
                              type="text" 
                              value={ans}
                              onChange={(e) => updateSubjectiveAnswerText(qIdx, lineIdx, e.target.value)}
                              className="flex-1 p-3 border border-amber-300 rounded-2xl text-sm bg-white outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            />
                            {(q.subjective_answers || []).length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeSubjectiveAnswerLine(qIdx, lineIdx)} 
                                className="text-slate-400 hover:text-red-500 p-1.5"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Lightbulb className="size-4 text-emerald-600" /> คำอธิบายเฉลยและวิธีทำอย่างละเอียด
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => handleGenerateExplanation(qIdx)}
                        disabled={generatingExpId === qIdx}
                        className="text-[10px] sm:text-xs flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm border border-emerald-200"
                      >
                        {generatingExpId === qIdx ? <Loader2 className="size-3 animate-spin"/> : <Sparkles className="size-3"/>}
                        ให้ AI ช่วยเขียนเฉลย
                      </button>
                    </div>
                    
                    <textarea
                      rows={8}
                      value={q.explanation || ""}
                      onChange={(e) => updateQuestionExplanation(qIdx, e.target.value)}
                      className="w-full p-4 border border-emerald-300 rounded-2xl text-base bg-white outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed whitespace-pre-line"
                    />
                  </div>

                </div>
              ))}

              <button onClick={addManualQuestion} className="w-full py-4 border-2 border-dashed border-primary/40 bg-primary/5 rounded-3xl text-primary font-bold hover:bg-primary/10 transition flex items-center justify-center gap-2">
                <PlusCircle className="size-5" /> เพิ่มข้อคำถามถัดไป
              </button>
            </div>

            <div className="pt-4 border-t mt-4 flex gap-3">
              <button onClick={() => { setExamModalMode("none"); setEditingExamId(null); }} className="flex-1 py-3.5 border rounded-2xl font-bold">ยกเลิก</button>
              <button onClick={() => handleSaveExamToDB(manualQuestions)} disabled={isUploading} className="flex-1 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 shadow disabled:opacity-50">
                {editingExamId ? "บันทึกการแก้ไขข้อสอบ" : "บันทึกข้อสอบเข้าระบบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Scan Images */}
      {examModalMode === "ai" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl animate-in fade-in slide-in-from-right-4">
            <div className="flex gap-3 mb-6"><button onClick={() => setExamModalMode("select")} className="p-2"><ChevronLeft/></button><h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="size-5 text-primary"/> เลือกรูปภาพข้อสอบที่ต้องการสแกน</h2></div>
            {previewImages.length === 0 ? (
              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-3xl cursor-pointer hover:bg-slate-50"><ImageIcon className="size-12 text-slate-400 mb-3"/><p className="text-sm font-medium text-slate-600">คลิกหรือลากไฟล์ภาพข้อสอบมาวางที่นี่ (เลือกได้หลายหน้า)</p><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-sm font-medium mb-3">รูปภาพที่เตรียมประมวลผล ({previewImages.length} หน้า)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                    {previewImages.map((img, idx) => (
                      <div key={idx} className="relative group border rounded-2xl overflow-hidden bg-white"><img src={img} className="w-full h-32 object-cover" /><div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{idx+1}</div><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 shadow"><Trash2 className="size-4"/></button></div>
                    ))}
                    <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-100 h-32"><PlusCircle className="size-6 text-slate-400 mb-1"/><span className="text-xs text-slate-500">เพิ่มหน้า</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
                  </div>
                </div>
                <button onClick={processImageWithAI} disabled={isAiProcessing} className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-50">
                  {isAiProcessing ? "AI กำลังแกะข้อสอบและเขียนเฉลยวิธีทำอย่างละเอียด..." : "ให้ AI สแกนแปลงเป็นข้อสอบ + เจนเฉลยวิธีทำ"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: AI Result Editor */}
      {examModalMode === "ai_result" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2"><Sparkles className="size-5 text-green-500"/><h2 className="text-xl font-bold text-slate-800">ผลลัพธ์จาก AI ({aiResult?.length || 0} ข้อ)</h2></div>
              <button onClick={() => { setExamModalMode("none"); setPreviewImages([]); }}><X className="size-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {aiResult && aiResult.map((q, idx) => (
                <div key={idx} className={`border rounded-2xl p-4 space-y-2.5 ${q.image_url === "NEEDS_IMAGE" ? "bg-red-50/50 border-red-200" : "bg-slate-50/50 border-slate-200"}`}>
                  {q.image_url === "NEEDS_IMAGE" && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3.5 py-1.5 rounded-xl text-[11px] font-bold mb-1 w-fit">
                      <AlertTriangle className="size-3.5" /> ข้อนี้ต้องอัปโหลดรูปภาพ! (เพิ่มรูปในโหมดแก้ไข)
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className={`font-bold text-sm ${q.image_url === "NEEDS_IMAGE" ? "text-red-900" : "text-slate-800"}`}>{idx + 1}. {q.question}</p>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${q.type === "subjective" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>
                      {q.type === "subjective" ? "อัตนัย (เขียนตอบ)" : "ปรนัย (ช้อยส์)"}
                    </span>
                  </div>

                  {q.type === "choice" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 mt-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className={`text-xs p-2 rounded-xl border ${q.correct_index === optIdx ? "bg-green-100 text-green-800 border-green-300 font-bold" : "bg-white text-slate-700"}`}>
                          {choiceLabels[optIdx]} {opt} {q.correct_index === optIdx && "✓ (เฉลย)"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5 pl-4 mt-2 bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                      <p className="text-[11px] font-bold text-amber-900">ช่องคำตอบอัตนัย:</p>
                      {(q.subjective_answers || [""]).map((ans, aIdx) => (
                        <div key={aIdx} className="text-xs bg-white p-2 rounded border text-amber-950 font-mono">ช่องที่ {aIdx + 1}: {ans || "(ว่าง)"}</div>
                      ))}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-800"><Lightbulb className="size-3.5" /> เฉลยและวิธีทำ:</p>
                      <p className="whitespace-pre-line text-slate-700 pl-5">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t mt-4 flex gap-3">
              <button onClick={() => { setManualQuestions(aiResult || []); setExamModalMode("manual"); }} className="flex-1 py-3.5 border border-primary text-primary font-bold rounded-2xl hover:bg-primary/5">แก้ไข/เพิ่มบรรทัดในโหมด Manual</button>
              <button onClick={() => handleSaveExamToDB(aiResult || [])} className="flex-1 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 shadow">บันทึกข้อสอบเข้าระบบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}