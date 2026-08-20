import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, BookOpen, Clock, Users, PlusCircle, Edit, 
  Trash2, UploadCloud, FileText, X, BarChart3, Mail, Phone, Lock, Save, History, 
  Image as ImageIcon, Sparkles, ChevronLeft, Filter, Search, Unlock, LogOut,
  GraduationCap, Video, CheckCircle2, Plus, ArrowUpRight, AlignLeft, CheckSquare,
  HelpCircle, Lightbulb, ShieldCheck, AlertTriangle, FilePenLine, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

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
  const [activeTab, setActiveTab] = useState<"dashboard" | "lessons" | "exams" | "users" | "worksheets">("exams");

  // --- States ---
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: "", email: "", password: "", phone: "", permissions: defaultPermissions });

  const [lessons, setLessons] = useState<any[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonFormData, setLessonFormData] = useState({
    id: 0, title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", video_url: "", pdf_url: "", description: ""
  });

  const [exams, setExams] = useState<any[]>([]);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [examModalMode, setExamModalMode] = useState<"none" | "select" | "exam_info" | "ai" | "manual" | "ai_result">("none");
  const [newExamInfo, setNewExamInfo] = useState<{ title: string; grade: string[]; program: string[]; subject: string; year: string }>({ 
    title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", year: "2566" 
  });
  const [manualQuestions, setManualQuestions] = useState<QuestionItem[]>([
    { id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }
  ]);

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<QuestionItem[] | null>(null);

  // 💡 States สำหรับ Worksheet
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [worksheetFormData, setWorksheetFormData] = useState({
    title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", pages: [] as string[]
  });
  const [isUploading, setIsUploading] = useState(false); // 💡 ป้องกันผู้ใช้กดรัวๆ ตอนกำลังอัปโหลด

  const [filterGrade, setFilterGrade] = useState("ป.6");
  const [filterProgram, setFilterProgram] = useState("ISM");
  const [filterSubject, setFilterSubject] = useState("ทั้งหมด");

  useEffect(() => {
    fetchStudents();
    fetchExams();
    fetchLessons();
    fetchWorksheets();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*').order('id', { ascending: true });
    if (!error && data) {
      setStudents(data);
      if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
    }
  };

  const fetchExams = async () => {
    const { data, error } = await supabase.from('exams').select('*').order('id', { ascending: false });
    if (!error && data) setExams(data);
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase.from('lessons').select('*').order('id', { ascending: false });
    if (!error && data) setLessons(data);
  };

  const fetchWorksheets = async () => {
    const { data, error } = await supabase.from('worksheets').select('*').order('id', { ascending: false });
    if (!error && data) setWorksheets(data);
  };

  // --- 💡 ฟังก์ชันช่วย: อัปโหลดรูปลง Storage ---
  const uploadImageToStorage = async (file: File, folderName: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderName}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('exam-vault-images') // ชื่อ Bucket ที่ให้คุณไปสร้าง
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    
    // ดึง URL ที่เปิดดูได้แบบ Public
    const { data: { publicUrl } } = supabase.storage.from('exam-vault-images').getPublicUrl(fileName);
    return publicUrl;
  };

  // --- Users Handlers ---
  const handleOpenAddStudent = () => { 
    setFormData({ id: 0, name: "", email: "", password: "", phone: "", permissions: defaultPermissions }); 
    setIsEditing(false); 
    setShowStudentModal(true); 
  };
  
  const handleOpenEditStudent = (student: any) => { 
    const perms = student.permissions || defaultPermissions;
    setFormData({ ...student, password: "", permissions: perms }); 
    setIsEditing(true); 
    setShowStudentModal(true); 
  };

  const handleTogglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key as keyof typeof prev.permissions] }
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (isEditing) { 
      const { error } = await supabase.from('students').update({
        name: formData.name, email: formData.email, phone: formData.phone, permissions: formData.permissions
      }).eq('id', formData.id);
      
      if (error) {
        alert("เกิดข้อผิดพลาดในการอัปเดต: " + error.message);
      } else {
        alert("อัปเดตข้อมูลและสิทธิ์นักเรียนสำเร็จ!");
        fetchStudents(); 
        if (selectedStudent?.id === formData.id) setSelectedStudent({ ...selectedStudent, ...formData });
      }
    } else { 
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const { error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
      if (authError) return alert("ไม่สามารถสร้างบัญชีได้: " + authError.message);
      
      if (adminSession) {
        await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      }
      const { error } = await supabase.from('students').insert([{
        name: formData.name, email: formData.email, phone: formData.phone,
        permissions: formData.permissions, scores: { math: 0, english: 0 }, examHistory: []
      }]);
      if (error) alert("เกิดข้อผิดพลาด: " + error.message);
      else { alert("สร้างบัญชีนักเรียนสำเร็จ!"); fetchStudents(); }
    } 
    setShowStudentModal(false); 
  };

  const handleDeleteStudent = async (id: number) => { 
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบนักเรียนคนนี้? ข้อมูลและคะแนนสอบทั้งหมดจะหายไปอย่างถาวร!")) { 
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (!error) { fetchStudents(); if (selectedStudent?.id === id) setSelectedStudent(null); }
    } 
  };

  // --- Lessons Handlers ---
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lessonFormData.grade.length === 0) return alert("กรุณาเลือกระดับชั้นอย่างน้อย 1 รายการ");
    if (lessonFormData.program.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 รายการ");

    const payload = {
      title: lessonFormData.title,
      grade: lessonFormData.grade.join(", "),
      program: lessonFormData.program.join(", "),
      subject: lessonFormData.subject,
      video_url: lessonFormData.video_url,
      pdf_url: lessonFormData.pdf_url,
      description: lessonFormData.description
    };

    if (lessonFormData.id) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', lessonFormData.id);
      if (error) alert("อัปเดตบทเรียนไม่สำเร็จ: " + error.message);
      else fetchLessons();
    } else {
      const { error } = await supabase.from('lessons').insert([payload]);
      if (error) alert("เพิ่มบทเรียนไม่สำเร็จ: " + error.message);
      else fetchLessons();
    }
    setShowLessonModal(false);
  };

  const handleDeleteLesson = async (id: number) => {
    if (confirm("ลบบทเรียนนี้ออกจากระบบ?")) {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (!error) fetchLessons();
    }
  };

  // --- 💡 Worksheet Handlers (อัปเดต Storage) ---
  const handleUploadWorksheetImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(e.target.files);
      const uploadedUrls: string[] = [];

      try {
        for (const file of files) {
          const url = await uploadImageToStorage(file, 'worksheets');
          uploadedUrls.push(url);
        }
        setWorksheetFormData(prev => ({ ...prev, pages: [...prev.pages, ...uploadedUrls] }));
      } catch (error) {
        alert("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveWorksheet = async () => {
    if (!worksheetFormData.title) return alert("กรุณาใส่ชื่อชีทแบบฝึกหัด");
    if (worksheetFormData.pages.length === 0) return alert("กรุณาอัปโหลดรูปชีทอย่างน้อย 1 หน้า");
    const payload = {
      title: worksheetFormData.title,
      grade: worksheetFormData.grade.join(", "),
      program: worksheetFormData.program.join(", "),
      subject: worksheetFormData.subject,
      pages: worksheetFormData.pages
    };
    const { error } = await supabase.from('worksheets').insert([payload]);
    if (error) alert("เกิดข้อผิดพลาดในการบันทึกชีท: " + error.message);
    else {
      alert("เพิ่มชีทแบบฝึกหัดเข้าระบบสำเร็จ!");
      setShowWorksheetModal(false);
      setWorksheetFormData({ title: "", grade: ["ป.6"], program: ["ISM"], subject: "คณิตศาสตร์", pages: [] });
      fetchWorksheets();
    }
  };

  const handleDeleteWorksheet = async (id: number) => {
    if (confirm("ต้องการลบชีทชุดนี้ออกจากระบบ?")) {
      const { error } = await supabase.from('worksheets').delete().eq('id', id);
      if (!error) fetchWorksheets();
    }
  };

  const handleLogout = async () => {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    }
  };

  // --- Edit Existing Exam Handler ---
  const handleOpenEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    
    const safeGrades = safeGetArray(exam.grade);
    const safePrograms = safeGetArray(exam.program);

    setNewExamInfo({
      title: exam.title,
      grade: safeGrades.length > 0 ? safeGrades : ["ป.6"],
      program: safePrograms.length > 0 ? safePrograms : ["ISM"],
      subject: exam.subject,
      year: exam.year || "2566"
    });

    const parsedQuestions: QuestionItem[] = (Array.isArray(exam.questions) ? exam.questions : []).map((q: any, idx: number) => ({
      id: q.id || idx + 1,
      type: q.type === "subjective" ? "subjective" : "choice",
      question: q.question || "",
      image_url: q.image_url || "",
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""],
      correct_index: typeof q.correct_index === "number" ? q.correct_index : 0,
      subjective_answers: Array.isArray(q.subjective_answers) && q.subjective_answers.length > 0 ? q.subjective_answers : [""],
      explanation: q.explanation || ""
    }));

    setManualQuestions(parsedQuestions.length > 0 ? parsedQuestions : [
      { id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }
    ]);
    setExamModalMode("manual");
  };

  // --- Manual Exam Question Helpers ---
  const addManualQuestion = () => {
    setManualQuestions(prev => [
      ...prev,
      { id: Date.now(), type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }
    ]);
  };

  const removeManualQuestion = (index: number) => {
    if (manualQuestions.length === 1) return alert("ต้องมีอย่างน้อย 1 ข้อคำถาม");
    setManualQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleQuestionType = (index: number, newType: "choice" | "subjective") => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        return {
          ...q,
          type: newType,
          options: q.options && q.options.length > 0 ? q.options : ["", "", "", ""],
          subjective_answers: q.subjective_answers && q.subjective_answers.length > 0 ? q.subjective_answers : [""]
        };
      }
      return q;
    }));
  };

  const updateQuestionText = (index: number, text: string) => setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, question: text } : q));
  const updateQuestionExplanation = (index: number, text: string) => setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, explanation: text } : q));
  
  // --- 💡 อัปเดตอัปโหลดภาพประกอบข้อสอบลง Storage ---
  const updateQuestionImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        const url = await uploadImageToStorage(file, 'exam-questions');
        setManualQuestions(prev => prev.map((q, i) => i === index ? { ...q, image_url: url } : q));
      } catch (error) {
        alert("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeQuestionImage = (index: number) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        const isNeedsImage = q.question.includes("จากรูป");
        return { ...q, image_url: isNeedsImage ? "NEEDS_IMAGE" : "" };
      }
      return q;
    }));
  };

  const addOptionToQuestion = (qIndex: number) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        if (q.options.length >= 5) { alert("เพิ่มตัวเลือกได้สูงสุด 5 ช้อยส์"); return q; }
        return { ...q, options: [...q.options, ""] };
      }
      return q;
    }));
  };

  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        if (q.options.length <= 2) { alert("ต้องมีอย่างน้อย 2 ตัวเลือก"); return q; }
        const updated = q.options.filter((_, oi) => oi !== optIndex);
        const prevCorrect = q.correct_index ?? 0;
        return { ...q, options: updated, correct_index: prevCorrect >= updated.length ? 0 : prevCorrect };
      }
      return q;
    }));
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        const nextOpts = [...q.options];
        nextOpts[optIndex] = text;
        return { ...q, options: nextOpts };
      }
      return q;
    }));
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => setManualQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, correct_index: optIndex } : q));

  const addSubjectiveAnswerLine = (qIndex: number) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) return { ...q, subjective_answers: [...(q.subjective_answers || []), ""] };
      return q;
    }));
  };

  const removeSubjectiveAnswerLine = (qIndex: number, lineIndex: number) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        const currentLines = q.subjective_answers || [];
        if (currentLines.length <= 1) { alert("ต้องมีอย่างน้อย 1 ช่องคำตอบ"); return q; }
        return { ...q, subjective_answers: currentLines.filter((_, li) => li !== lineIndex) };
      }
      return q;
    }));
  };

  const updateSubjectiveAnswerText = (qIndex: number, lineIndex: number, text: string) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        const currentLines = [...(q.subjective_answers || [""])];
        currentLines[lineIndex] = text;
        return { ...q, subjective_answers: currentLines };
      }
      return q;
    }));
  };

  // --- AI OCR Processing ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setPreviewImages(prev => [...prev, ...urls]); 
    }
  };

  const removeImage = (indexToRemove: number) => setPreviewImages(prev => prev.filter((_, index) => index !== indexToRemove));

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error("แปลงไฟล์ไม่สำเร็จ"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processImageWithAI = async () => {
    if (previewImages.length === 0) return;
    setIsAiProcessing(true);
    setAiResult(null);

    const apiKey = "AQ.Ab8RN6LyaWE8FG3kCDnfyGsKsiDEoSVaTT3m0TMnClGY5-Vyow";

    try {
      const imageParts = await Promise.all(
        previewImages.map(async (imgUrl) => {
          const base64Data = await urlToBase64(imgUrl);
          return { inline_data: { mime_type: "image/jpeg", data: base64Data } };
        })
      );

      // 💡 อัปเดตคำสั่ง (Prompt) ชี้เป้า "NEEDS_IMAGE"
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
1. ⚠️ ในฟิลด์ options ให้ใส่เฉพาะ "เนื้อหาคำตอบ" เท่านั้น ห้ามใส่ตัวอักษร ก. ข. ค. ง. จ. นำหน้าเด็ดขาด!
2. ⚠️ หากโจทย์ข้อนั้นมี "รูปภาพเรขาคณิต" ประกอบโจทย์ หรือในโจทย์มีคำว่า "จากรูป" ให้ใส่ค่าในฟิลด์ image_url เป็น "NEEDS_IMAGE" เพื่อแจ้งเตือนระบบ
3. หากเฉลยในรูปมีการโยงลูกศรแบบรูปภาพ (เช่น อนุกรมตัวเลข) ให้เขียนอธิบายเป็น text ในช่อง explanation แทนการแปลงเป็นเครื่องหมายแปลกๆ
4. ตอบกลับมาเป็นโครงสร้าง JSON เพียวๆ เท่านั้น ห้ามใส่ markdown code block`;

      const requestBody = JSON.stringify({ contents: [{ parts: [{ text: promptText }, ...imageParts] }] });

      const candidateModels = ["gemini-3.6-flash", "gemini-3.6-flash-lite", "gemini-3.6-pro"];
      let parsedJsonResult: any = null;
      let lastErrorMessage = "";

      for (const model of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: requestBody,
              }
            );

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const rawText = data.candidates[0].content.parts[0].text;
              const cleanedText = rawText.replace(/```json|```/g, "").trim();
              parsedJsonResult = JSON.parse(cleanedText);
              break;
            } else {
              lastErrorMessage = data.error?.message || `Error status ${response.status}`;
              if (response.status === 503 || response.status === 429 || lastErrorMessage.includes("high demand")) {
                await new Promise((res) => setTimeout(res, 1000));
              } else {
                break;
              }
            }
          } catch (err: any) { lastErrorMessage = err.message; }
        }
        if (parsedJsonResult) break;
      }

      if (parsedJsonResult) {
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
        throw new Error(lastErrorMessage || "ไม่สามารถประมวลผล AI ได้ในขณะนี้");
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      alert("AI ขัดข้อง: " + error.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSaveExamToDB = async (questionsToSave: QuestionItem[]) => {
    if (!questionsToSave || questionsToSave.length === 0) return alert("ไม่มีข้อสอบให้บันทึก");
    if (newExamInfo.grade.length === 0) return alert("กรุณาเลือกระดับชั้นอย่างน้อย 1 รายการ");
    if (newExamInfo.program.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 รายการ");

    const missingImages = questionsToSave.some(q => q.image_url === "NEEDS_IMAGE");
    if (missingImages) {
      const confirmSave = confirm("มีบางข้อที่จำเป็นต้องใช้รูปภาพประกอบ แต่คุณยังไม่ได้อัปโหลดรูปให้ (แถบสีแดง)\nคุณต้องการบันทึกข้อสอบโดยไม่มีรูปภาพใช่หรือไม่?");
      if (!confirmSave) return; 
      
      questionsToSave = questionsToSave.map(q => ({
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
      questions: questionsToSave,
      total_questions: questionsToSave.length,
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
      if (!error) fetchExams();
    }
  };

  const getActivePermissionsText = (perms: any, keys: string[]) => {
    if (!perms) return "-";
    const active = keys.filter((k: string) => perms[k]);
    return active.length > 0 ? active.join(", ") : "ไม่มีสิทธิ์";
  };

  const filteredExams = exams.filter(exam => {
    const examGrades = safeGetArray(exam.grade);
    const examPrograms = safeGetArray(exam.program);
    
    const matchGrade = examGrades.includes(filterGrade);
    const matchProgram = examPrograms.includes(filterProgram);
    const matchSubject = filterSubject === "ทั้งหมด" || exam.subject === filterSubject;
    return matchGrade && matchProgram && matchSubject;
  });

  const filteredLessons = lessons.filter(l => {
    const lessonGrades = safeGetArray(l.grade);
    const lessonPrograms = safeGetArray(l.program);
    
    const matchGrade = lessonGrades.includes(filterGrade);
    const matchProgram = lessonPrograms.includes(filterProgram);
    const matchSubject = filterSubject === "ทั้งหมด" || l.subject === filterSubject;
    return matchGrade && matchProgram && matchSubject;
  });

  const filteredWorksheets = worksheets.filter(ws => {
    const wsGrades = safeGetArray(ws.grade);
    const wsPrograms = safeGetArray(ws.program);
    const matchGrade = wsGrades.includes(filterGrade);
    const matchProgram = wsPrograms.includes(filterProgram);
    const matchSubject = filterSubject === "ทั้งหมด" || ws.subject === filterSubject;
    return matchGrade && matchProgram && matchSubject;
  });

  const choiceLabels = ["ก.", "ข.", "ค.", "ง.", "จ."];

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-white p-6 md:flex shadow-sm">
        <div className="flex-1">
          <h2 className="mb-8 text-2xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="size-6" /> คลังสอบ Admin
          </h2>
          <nav className="flex flex-col space-y-2">
            <button onClick={() => setActiveTab("dashboard")} className={`flex items-center gap-3 rounded-xl p-3 font-medium transition-all ${activeTab === "dashboard" ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><LayoutDashboard className="size-5" /> ภาพรวมระบบ</button>
            <button onClick={() => setActiveTab("lessons")} className={`flex items-center gap-3 rounded-xl p-3 font-medium transition-all ${activeTab === "lessons" ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><GraduationCap className="size-5" /> จัดการเนื้อหาบทเรียน</button>
            <button onClick={() => setActiveTab("exams")} className={`flex items-center gap-3 rounded-xl p-3 font-medium transition-all ${activeTab === "exams" ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><BookOpen className="size-5" /> จัดการข้อสอบ</button>
            <button onClick={() => setActiveTab("worksheets")} className={`flex items-center gap-3 rounded-xl p-3 font-medium transition-all ${activeTab === "worksheets" ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><FilePenLine className="size-5" /> จัดการชีทแบบฝึกหัด</button>
            <button onClick={() => setActiveTab("users")} className={`flex items-center gap-3 rounded-xl p-3 font-medium transition-all ${activeTab === "users" ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><Users className="size-5" /> จัดการผู้ใช้งาน</button>
          </nav>
        </div>
        
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl p-3 font-medium text-red-500 transition-colors hover:bg-red-50">
            <LogOut className="size-5" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 w-full overflow-x-hidden relative h-screen overflow-y-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-slate-800">
            {activeTab === "dashboard" && "Dashboard (ภาพรวมระบบ)"}
            {activeTab === "lessons" && "จัดการเนื้อหาบทเรียน"}
            {activeTab === "exams" && "จัดการชุดข้อสอบ"}
            {activeTab === "worksheets" && "จัดการชีทแบบฝึกหัด"}
            {activeTab === "users" && "จัดการผู้ใช้งาน"}
          </h1>

          {activeTab === "exams" && (
            <button 
              onClick={() => { 
                setEditingExamId(null);
                setNewExamInfo({ title: "", grade: [filterGrade], program: [filterProgram], subject: filterSubject === "ทั้งหมด" ? "คณิตศาสตร์" : filterSubject, year: "2566" });
                setExamModalMode("exam_info"); 
                setPreviewImages([]); 
                setManualQuestions([{ id: 1, type: "choice", question: "", image_url: "", options: ["", "", "", ""], correct_index: 0, subjective_answers: [""], explanation: "" }]);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> เพิ่มข้อสอบใหม่
            </button>
          )}

          {activeTab === "lessons" && (
            <button 
              onClick={() => {
                setLessonFormData({ id: 0, title: "", grade: [filterGrade], program: [filterProgram], subject: filterSubject === "ทั้งหมด" ? "คณิตศาสตร์" : filterSubject, video_url: "", pdf_url: "", description: "" });
                setShowLessonModal(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> เพิ่มบทเรียนใหม่
            </button>
          )}

          {activeTab === "worksheets" && (
            <button 
              onClick={() => setShowWorksheetModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <PlusCircle className="size-5" /> อัปโหลดชีทใหม่
            </button>
          )}
        </div>

        {/* --- TAB: DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-medium text-slate-500">จำนวนนักเรียนทั้งหมด</p><p className="mt-2 text-3xl font-bold text-slate-800">{students.length} <span className="text-base font-normal text-slate-500">คน</span></p></div>
              <div className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-medium text-slate-500">จำนวนข้อสอบ</p><p className="mt-2 text-3xl font-bold text-slate-800">{exams.length} <span className="text-base font-normal text-slate-500">ชุด</span></p></div>
              <div className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-medium text-slate-500">จำนวนบทเรียน</p><p className="mt-2 text-3xl font-bold text-slate-800">{lessons.length} <span className="text-base font-normal text-slate-500">บทเรียน</span></p></div>
            </div>
          </div>
        )}

        {/* --- TAB: LESSONS --- */}
        {activeTab === "lessons" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-2xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่บทเรียน</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">บทเรียน: {filterGrade} / {filterProgram} {filterSubject !== "ทั้งหมด" ? `/ ${filterSubject}` : ""}</h3>
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">พบ {filteredLessons.length} บทเรียน</span>
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
                              }} className="p-2 text-slate-400 hover:text-primary transition-colors border rounded-lg bg-white shadow-sm" title="แก้ไขบทเรียน"><Edit className="size-4"/></button>
                              <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors border rounded-lg bg-white shadow-sm" title="ลบบบทเรียน"><Trash2 className="size-4"/></button>
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

        {/* --- TAB: EXAMS --- */}
        {activeTab === "exams" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-2xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่ข้อสอบ</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">ข้อสอบ: {filterGrade} / {filterProgram} {filterSubject !== "ทั้งหมด" ? `/ ${filterSubject}` : ""}</h3>
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">พบ {filteredExams.length} รายการ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">ชื่อชุดข้อสอบ</th><th className="p-4 font-medium">รายวิชา</th><th className="p-4 font-medium">ปีการศึกษา</th><th className="p-4 font-medium text-center">จำนวนข้อ</th><th className="p-4 font-medium">สถานะ</th><th className="p-4 font-medium">จัดการ</th></tr>
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
                          <td className="p-4 text-slate-600 text-center font-medium bg-slate-50/50">{exam.total_questions}</td>
                          <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${exam.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{exam.status === 'published' ? 'พร้อมใช้งาน' : 'ฉบับร่าง'}</span></td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleOpenEditExam(exam)} className="p-2 text-slate-400 hover:text-primary transition-colors border rounded-lg bg-white shadow-sm" title="แก้ไขข้อสอบ"><Edit className="size-4"/></button>
                              <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors border rounded-lg bg-white shadow-sm" title="ลบข้อสอบ"><Trash2 className="size-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="p-12 text-center text-slate-400"><BookOpen className="size-10 mx-auto mb-3 opacity-25" /><p>ยังไม่มีข้อมูลข้อสอบในหมวดหมู่นี้</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: WORKSHEETS --- */}
        {activeTab === "worksheets" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-2xl border shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-4"><Filter className="size-5 text-primary" /><h3 className="font-bold text-slate-800">หมวดหมู่ชีท</h3></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">ระดับชั้น:</span>
                <div className="flex flex-wrap gap-2">{["ป.4", "ป.5", "ป.6"].map(grade => (<button key={grade} onClick={() => setFilterGrade(grade)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterGrade === grade ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{grade}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-semibold text-slate-700 w-24">แผนการเรียน:</span>
                <div className="flex flex-wrap gap-2">{["ISM", "EP", "ภาคปกติ"].map(program => (<button key={program} onClick={() => setFilterProgram(program)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterProgram === program ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${program}`}</button>))}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                <span className="font-semibold text-slate-700 w-24">รายวิชา:</span>
                <div className="flex flex-wrap gap-2">{["ทั้งหมด", "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "สังคมศึกษา"].map(subject => (<button key={subject} onClick={() => setFilterSubject(subject)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${filterSubject === subject ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{subject}</button>))}</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-slate-50/70 p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">รายการชีท</h3>
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">พบ {filteredWorksheets.length} รายการ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500 bg-white">
                    <tr><th className="p-4 font-medium">ชื่อชุดชีทแบบฝึกหัด</th><th className="p-4 font-medium">วิชา</th><th className="p-4 font-medium">จำนวนหน้า</th><th className="p-4 font-medium">จัดการ</th></tr>
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
                            <button onClick={() => handleDeleteWorksheet(ws.id)} className="p-2 text-slate-400 hover:text-red-500 border rounded-lg bg-white shadow-sm" title="ลบชีท"><Trash2 className="size-4"/></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400">ยังไม่มีข้อมูลชีทในหมวดหมู่นี้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: USERS --- */}
        {activeTab === "users" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ซ้าย: รายชื่อนักเรียน */}
              <div className="lg:col-span-4 rounded-2xl border bg-white shadow-sm p-5 flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-lg text-slate-800">รายชื่อนักเรียน</h3>
                  <button onClick={handleOpenAddStudent} className="flex items-center gap-1.5 text-xs bg-primary text-white px-3.5 py-2 rounded-xl font-semibold hover:bg-primary/90 transition shadow-sm"><PlusCircle className="size-4" /> เพิ่มนักเรียน</button>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {students.map((student) => (
                    <div key={student.id} onClick={() => setSelectedStudent(student)} className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <div className={`p-2.5 rounded-xl ${selectedStudent?.id === student.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}><Users className="size-5"/></div>
                      <div>
                        <p className={`font-semibold text-sm ${selectedStudent?.id === student.id ? 'text-primary' : 'text-slate-800'}`}>{student.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {getActivePermissionsText(student.permissions, ["ป.4", "ป.5", "ป.6"])} / {getActivePermissionsText(student.permissions, ["ISM", "EP", "ภาคปกติ"])}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ขวา: รายละเอียดและสิทธิ์ของนักเรียน */}
              {selectedStudent ? (
                <div className="lg:col-span-8 rounded-2xl border bg-white shadow-sm p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><BarChart3 className="size-5 text-primary"/> ข้อมูลและผลการเรียน</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEditStudent(selectedStudent)} className="p-2 text-slate-500 hover:text-primary bg-slate-50 hover:bg-primary/10 rounded-xl transition-colors border shadow-sm" title="แก้ไขข้อมูลและสิทธิ์"><Edit className="size-4"/></button>
                      <button onClick={() => handleDeleteStudent(selectedStudent.id)} className="p-2 text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors border shadow-sm" title="ลบนักเรียน"><Trash2 className="size-4"/></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{selectedStudent.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{selectedStudent.email} • {selectedStudent.phone || "ไม่ระบุเบอร์โทร"}</p>
                      </div>
                      <button onClick={() => handleOpenEditStudent(selectedStudent)} className="text-xs font-bold text-primary bg-white border border-primary/30 px-3.5 py-1.5 rounded-xl hover:bg-primary/5 transition self-start sm:self-auto">
                        แก้ไขสิทธิ์
                      </button>
                    </div>

                    {/* แสดงสิทธิ์ระดับชั้นและแผนการเรียน */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> สิทธิ์ระดับชั้น:</span>
                        <p className="text-sm font-bold text-slate-800">{getActivePermissionsText(selectedStudent.permissions, ["ป.4", "ป.5", "ป.6"])}</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> สิทธิ์แผนการเรียน:</span>
                        <p className="text-sm font-bold text-slate-800">{getActivePermissionsText(selectedStudent.permissions, ["ISM", "EP", "ภาคปกติ"])}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-8 rounded-2xl border bg-slate-50 border-dashed border-slate-200 shadow-sm p-6 h-[400px] flex items-center justify-center text-slate-400 text-sm">
                  คลิกที่รายชื่อนักเรียนเพื่อดูรายละเอียดและผลสอบ
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================= */}
      {/* MODAL: เพิ่ม/แก้ไข บทเรียน */}
      {/* ========================================= */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">{lessonFormData.id ? "แก้ไขบทเรียน" : "เพิ่มบทเรียนใหม่"}</h2>
              <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:bg-slate-100 rounded-full p-1.5"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อบทเรียน</label>
                <input type="text" required value={lessonFormData.title} onChange={e => setLessonFormData({ ...lessonFormData, title: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="เช่น บทที่ 1 เศษส่วนและทศนิยม" />
              </div>
              
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น (เลือกได้หลายชั้น)</label>
                  <div className="flex flex-wrap gap-2">
                    {["ป.4", "ป.5", "ป.6"].map(g => (
                      <button 
                        key={g} 
                        type="button" 
                        onClick={() => setLessonFormData(prev => ({
                          ...prev, 
                          grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                        }))} 
                        className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-all ${lessonFormData.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน (เลือกได้หลายแผน)</label>
                  <div className="flex flex-wrap gap-2">
                    {["ISM", "EP", "ภาคปกติ"].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setLessonFormData(prev => ({
                          ...prev, 
                          program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                        }))} 
                        className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-all ${lessonFormData.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {p === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${p}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">วิชา</label>
                <select value={lessonFormData.subject} onChange={e => setLessonFormData({ ...lessonFormData, subject: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white">
                  <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                </select>
              </div>

              <div><label className="block text-sm font-bold text-slate-700 mb-1">ลิงก์วิดีโอการสอน (YouTube/Drive)</label><input type="url" value={lessonFormData.video_url} onChange={e => setLessonFormData({ ...lessonFormData, video_url: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="https://youtube.com/..." /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">ลิงก์เอกสารประกอบการเรียน (PDF)</label><input type="url" value={lessonFormData.pdf_url} onChange={e => setLessonFormData({ ...lessonFormData, pdf_url: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="https://drive.google.com/..." /></div>
              
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowLessonModal(false)} className="flex-1 py-3 border rounded-xl">ยกเลิก</button><button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90">บันทึกบทเรียน</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 💡 MODAL: อัปโหลดชีทแบบฝึกหัด (อัปเดต Storage) */}
      {/* ========================================= */}
      {showWorksheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">อัปโหลดชีทแบบฝึกหัด (กระดาษใส)</h2>
              <button onClick={() => setShowWorksheetModal(false)} className="text-slate-400 hover:bg-slate-100 rounded-full p-1.5"><X className="size-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อชุดแบบฝึกหัด</label>
                <input type="text" value={worksheetFormData.title} onChange={e => setWorksheetFormData({ ...worksheetFormData, title: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="เช่น แบบฝึกหัดคณิตศาสตร์ บทที่ 1" />
              </div>
              
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น (เลือกได้หลายชั้น)</label>
                  <div className="flex flex-wrap gap-2">
                    {["ป.4", "ป.5", "ป.6"].map(g => (
                      <button 
                        key={g} 
                        type="button" 
                        onClick={() => setWorksheetFormData(prev => ({
                          ...prev, 
                          grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                        }))} 
                        className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-all ${worksheetFormData.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน (เลือกได้หลายแผน)</label>
                  <div className="flex flex-wrap gap-2">
                    {["ISM", "EP", "ภาคปกติ"].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setWorksheetFormData(prev => ({
                          ...prev, 
                          program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                        }))} 
                        className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-all ${worksheetFormData.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {p === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${p}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">วิชา</label>
                <select value={worksheetFormData.subject} onChange={e => setWorksheetFormData({ ...worksheetFormData, subject: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm bg-white">
                  <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">อัปโหลดรูปภาพชีท (เลือกได้หลายหน้าพร้อมกัน)</label>
                <input type="file" accept="image/*" multiple onChange={handleUploadWorksheetImages} disabled={isUploading} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 cursor-pointer" />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="size-6 animate-spin text-primary mb-2" />
                    <span className="text-xs font-bold text-primary">กำลังอัปโหลดรูปภาพ...</span>
                  </div>
                )}
                
                {!isUploading && worksheetFormData.pages.length > 0 && (
                  <p className="mt-3 text-sm font-medium text-emerald-600">อัปโหลดเข้า Storage สำเร็จแล้ว {worksheetFormData.pages.length} หน้า</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowWorksheetModal(false)} className="flex-1 py-3 border rounded-xl">ยกเลิก</button>
                <button onClick={handleSaveWorksheet} disabled={isUploading} className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">บันทึกเข้าสู่ระบบ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL: เพิ่ม/แก้ไข ข้อมูลและสิทธิ์นักเรียน */}
      {/* ========================================= */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ระดับชั้นที่อนุญาตให้เข้าสอบ</p>
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">แผนการเรียนที่อนุญาตให้เข้าสอบ</p>
                    {["ISM", "EP", "ภาคปกติ"].map(program => {
                      const isChecked = !!formData.permissions?.[program as keyof typeof formData.permissions];
                      return (
                        <label key={program} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-white border-primary shadow-sm' : 'bg-slate-100/70 border-slate-200 hover:bg-white'}`}>
                          <span className={`text-sm font-semibold ${isChecked ? 'text-primary' : 'text-slate-600'}`}>{program === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${program}`}</span>
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
                <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 py-3 rounded-xl border font-medium text-slate-600 hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 shadow-md"><Save className="size-4"/> บันทึกข้อมูลและสิทธิ์</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 💡 MODAL: เพิ่ม/แก้ไข ข้อสอบ */}
      {/* ========================================= */}
      {examModalMode !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
          
          {/* STEP 1: ตั้งชื่อข้อสอบ */}
          {examModalMode === "exam_info" && (
            <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between mb-6 border-b pb-3">
                <h2 className="text-xl font-bold text-slate-800">{editingExamId ? "แก้ไขข้อมูลชุดข้อสอบ" : "1. ข้อมูลชุดข้อสอบ"}</h2>
                <button onClick={() => setExamModalMode("none")} className="p-1"><X className="size-5" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อชุดข้อสอบ</label>
                  <input type="text" value={newExamInfo.title} onChange={e => setNewExamInfo({...newExamInfo, title: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="เช่น ตะลุยโจทย์เรขาคณิตเข้า ม.1 (ชุดที่ 1)"/>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ระดับชั้น (เลือกได้หลายชั้น)</label>
                    <div className="flex flex-wrap gap-2">
                      {["ป.4", "ป.5", "ป.6"].map(g => (
                        <button 
                          key={g} 
                          type="button" 
                          onClick={() => setNewExamInfo(prev => ({
                            ...prev, 
                            grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g]
                          }))} 
                          className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all ${newExamInfo.grade.includes(g) ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">แผนการเรียน (เลือกได้หลายแผน)</label>
                    <div className="flex flex-wrap gap-2">
                      {["ISM", "EP", "ภาคปกติ"].map(p => (
                        <button 
                          key={p} 
                          type="button" 
                          onClick={() => setNewExamInfo(prev => ({
                            ...prev, 
                            program: prev.program.includes(p) ? prev.program.filter(x => x !== p) : [...prev.program, p]
                          }))} 
                          className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all ${newExamInfo.program.includes(p) ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                        >
                          {p === "ภาคปกติ" ? "ภาคปกติ (Regular)" : `แผน ${p}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">รายวิชา</label>
                    <select value={newExamInfo.subject} onChange={e => setNewExamInfo({...newExamInfo, subject: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white">
                      <option>คณิตศาสตร์</option><option>วิทยาศาสตร์</option><option>ภาษาอังกฤษ</option><option>ภาษาไทย</option><option>สังคมศึกษา</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">ปีการศึกษา</label>
                    <input type="text" value={newExamInfo.year} onChange={e => setNewExamInfo({...newExamInfo, year: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                  </div>
                </div>
                <button onClick={() => setExamModalMode("select")} className="w-full py-4 bg-primary text-white rounded-xl font-bold mt-2 shadow-md hover:bg-primary/90 transition-transform active:scale-[0.98]">
                  ถัดไป: จัดการข้อคำถาม
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: เลือกวิธีนำเข้า */}
          {examModalMode === "select" && (
            <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in slide-in-from-right-4">
              <div className="flex gap-3 mb-6 border-b pb-4"><button onClick={() => setExamModalMode("exam_info")} className="p-2"><ChevronLeft/></button><div><h2 className="text-xl font-bold text-slate-800">2. นำเข้าข้อคำถาม</h2><p className="text-sm text-slate-500">{newExamInfo.title}</p></div></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <button onClick={() => setExamModalMode("ai")} className="flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-8 hover:bg-primary/10 transition"><Sparkles className="size-9 text-primary" /><p className="font-bold text-primary text-base">สแกนภาพข้อสอบ (AI OCR + เฉลยวิธีทำ)</p></button>
                <button onClick={() => setExamModalMode("manual")} className="flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 p-8 hover:bg-slate-50 transition"><FileText className="size-9 text-slate-500" /><p className="font-bold text-slate-700 text-base">พิมพ์ข้อสอบเอง (ปรนัย/อัตนัย/เฉลย)</p></button>
              </div>
            </div>
          )}

          {/* STEP 3 (MANUAL): ระบบสร้าง/แก้ไขข้อสอบแบบ Manual */}
          {examModalMode === "manual" && (
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-7 shadow-2xl animate-in fade-in">
              <div className="flex flex-col border-b pb-4 mb-4 gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {!editingExamId && <button onClick={() => setExamModalMode("select")} className="p-1.5 hover:bg-slate-100 rounded-lg mt-1"><ChevronLeft/></button>}
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">{editingExamId ? `แก้ไขชุดข้อสอบ: ${newExamInfo.title}` : "สร้างข้อสอบแบบ Manual"} ({manualQuestions.length} ข้อ)</h2>
                      
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 w-fit">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">ชั้นปี:</span>
                          <div className="flex gap-1.5">
                            {["ป.4", "ป.5", "ป.6"].map(g => (
                              <button 
                                key={g} type="button" 
                                onClick={() => setNewExamInfo(prev => ({ ...prev, grade: prev.grade.includes(g) ? prev.grade.filter(x => x !== g) : [...prev.grade, g] }))} 
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${newExamInfo.grade.includes(g) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
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
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${newExamInfo.program.includes(p) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                              >{p === "ภาคปกติ" ? "ภาคปกติ" : p}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setExamModalMode("none"); setEditingExamId(null); }} className="p-1.5 hover:bg-slate-100 rounded-full shrink-0"><X className="size-5" /></button>
                </div>
              </div>

              {/* รายการข้อคำถาม */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {manualQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className={`border-2 rounded-2xl p-5 bg-white shadow-sm relative space-y-4 transition-all ${q.image_url === "NEEDS_IMAGE" ? "border-red-400 bg-red-50/30" : "border-slate-200"}`}>
                    
                    {q.image_url === "NEEDS_IMAGE" && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3 py-2 rounded-lg text-xs font-bold mb-2">
                        <AlertTriangle className="size-4" /> 
                        AI แจ้งว่าข้อนี้มีรูปภาพประกอบ (เช่น รูปเรขาคณิต) กรุณาแคปรูปแล้วอัปโหลดในช่องด้านล่าง!
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-base">ข้อที่ {qIdx + 1}</span>
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border">
                          <button
                            type="button"
                            onClick={() => toggleQuestionType(qIdx, "choice")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${q.type === "choice" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            <CheckSquare className="size-3.5" /> ปรนัย (ช้อยส์)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleQuestionType(qIdx, "subjective")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${q.type === "subjective" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            <AlignLeft className="size-3.5" /> อัตนัย (เขียนตอบ)
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removeManualQuestion(qIdx)} className="text-slate-400 hover:text-red-500 p-1 self-end sm:self-auto"><Trash2 className="size-4" /></button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">โจทย์คำถาม</label>
                      <textarea 
                        rows={2}
                        value={q.question}
                        onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        placeholder="พิมพ์ข้อความโจทย์คำถามที่นี่..."
                        className="w-full p-3 border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    {/* 💡 ส่วนอัปโหลดรูปภาพประกอบข้อสอบ (อัปเดต Storage) */}
                    <div className={`p-4 rounded-xl border relative ${q.image_url === "NEEDS_IMAGE" ? "bg-red-50 border-red-200 border-dashed" : "bg-slate-50 border-slate-200"}`}>
                      <label className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${q.image_url === "NEEDS_IMAGE" ? "text-red-600" : "text-slate-600"}`}>
                        <ImageIcon className={`size-4 ${q.image_url === "NEEDS_IMAGE" ? "text-red-500" : "text-primary"}`} /> รูปภาพประกอบโจทย์
                      </label>
                      {q.image_url && q.image_url !== "NEEDS_IMAGE" ? (
                        <div className="relative inline-block border rounded-xl overflow-hidden bg-white">
                          <img src={q.image_url} alt="Question Attachment" className="max-h-48 object-contain" />
                          <button onClick={() => removeQuestionImage(qIdx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow"><X className="size-3.5" /></button>
                        </div>
                      ) : (
                        <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-dashed rounded-xl hover:bg-slate-100 text-xs w-fit ${isUploading ? "cursor-wait opacity-50" : "cursor-pointer"} ${q.image_url === "NEEDS_IMAGE" ? "border-red-400 text-red-600 shadow-sm shadow-red-100" : "border-slate-300 text-slate-600"}`}>
                          {isUploading ? <Loader2 className="size-4 animate-spin text-primary" /> : <UploadCloud className={`size-4 ${q.image_url === "NEEDS_IMAGE" ? "text-red-500" : "text-primary"}`} />} 
                          {isUploading ? "กำลังอัปโหลด..." : q.image_url === "NEEDS_IMAGE" ? "คลิกอัปโหลดรูปภาพด่วน!" : "อัปโหลดรูปภาพโจทย์"}
                          <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => updateQuestionImage(qIdx, e)} />
                        </label>
                      )}
                    </div>

                    {/* โหมดปรนัย */}
                    {q.type === "choice" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-600">ตัวเลือกช้อยส์ ({q.options.length}/5) - ติ๊กวงกลมเพื่อเลือกข้อที่ถูกต้อง</label>
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
                                className={`p-2 rounded-full border transition-all ${q.correct_index === optIdx ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-slate-300 border-slate-300 hover:border-slate-400"}`}
                              >
                                <CheckCircle2 className="size-4" />
                              </button>
                              <span className="font-bold text-sm text-slate-600 w-6">{choiceLabels[optIdx] || `${optIdx + 1}.`}</span>
                              <input 
                                type="text" 
                                value={opt}
                                onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                className="flex-1 p-2.5 border rounded-xl text-sm outline-none focus:border-primary"
                              />
                              {q.options.length > 2 && (
                                <button type="button" onClick={() => removeOptionFromQuestion(qIdx, optIdx)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="size-4"/></button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* โหมดอัตนัย */}
                    {q.type === "subjective" && (
                      <div className="space-y-3 pt-2 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
                        <div className="flex justify-between items-center">
                          <div>
                            <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <AlignLeft className="size-4 text-amber-600" /> ช่องคำตอบแบบอัตนัย ({(q.subjective_answers || []).length} ช่อง)
                            </label>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => addSubjectiveAnswerLine(qIdx)} 
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
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
                                className="flex-1 p-2.5 border border-amber-300 rounded-xl text-sm bg-white outline-none focus:ring-1 focus:ring-amber-500"
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

                    <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1.5">
                      <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Lightbulb className="size-4 text-emerald-600" /> คำอธิบายเฉลยและวิธีทำอย่างละเอียด
                      </label>
                      <textarea
                        rows={3}
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestionExplanation(qIdx, e.target.value)}
                        className="w-full p-2.5 border border-emerald-300 rounded-xl text-sm bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                  </div>
                ))}

                <button onClick={addManualQuestion} className="w-full py-3.5 border-2 border-dashed border-primary/40 bg-primary/5 rounded-2xl text-primary font-bold hover:bg-primary/10 transition flex items-center justify-center gap-2">
                  <PlusCircle className="size-5" /> เพิ่มข้อคำถามถัดไป
                </button>
              </div>

              <div className="pt-4 border-t mt-4 flex gap-3">
                <button onClick={() => { setExamModalMode("none"); setEditingExamId(null); }} className="flex-1 py-3 border rounded-xl font-medium">ยกเลิก</button>
                <button onClick={() => handleSaveExamToDB(manualQuestions)} disabled={isUploading} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow disabled:opacity-50">
                  {editingExamId ? "บันทึกการแก้ไขข้อสอบ" : "บันทึกข้อสอบเข้าระบบ"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 (AI OCR) และ STEP 4 (AI RESULT) ขอคงไว้ตามเดิม ไม่มีการตัดทอนเพื่อความสมบูรณ์ */}
          {/* STEP 3 (AI OCR): อัปโหลดรูปภาพ */}
          {examModalMode === "ai" && (
            <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in slide-in-from-right-4">
              <div className="flex gap-3 mb-6"><button onClick={() => setExamModalMode("select")} className="p-2"><ChevronLeft/></button><h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="size-5 text-primary"/> เลือกรูปภาพข้อสอบที่ต้องการสแกน</h2></div>
              {previewImages.length === 0 ? (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-50"><ImageIcon className="size-12 text-slate-400 mb-3"/><p className="text-sm font-medium text-slate-600">คลิกหรือลากไฟล์ภาพข้อสอบมาวางที่นี่ (เลือกได้หลายหน้า)</p><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <p className="text-sm font-medium mb-3">รูปภาพที่เตรียมประมวลผล ({previewImages.length} หน้า)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                      {previewImages.map((img, idx) => (
                        <div key={idx} className="relative group border rounded-xl overflow-hidden bg-white"><img src={img} className="w-full h-32 object-cover" /><div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{idx+1}</div><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 shadow"><Trash2 className="size-4"/></button></div>
                      ))}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-100 h-32"><PlusCircle className="size-6 text-slate-400 mb-1"/><span className="text-xs text-slate-500">เพิ่มหน้า</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
                    </div>
                  </div>
                  <button onClick={processImageWithAI} disabled={isAiProcessing} className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                    {isAiProcessing ? "AI กำลังแกะข้อสอบและเขียนเฉลยวิธีทำอย่างละเอียด..." : "ให้ AI สแกนแปลงเป็นข้อสอบ + เจนเฉลยวิธีทำ"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 (AI RESULT): ตรวจสอบผลลัพธ์จาก AI */}
          {examModalMode === "ai_result" && (
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-7 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between mb-4 border-b pb-3">
                <div className="flex items-center gap-2"><Sparkles className="size-5 text-green-500"/><h2 className="text-xl font-bold text-slate-800">ผลลัพธ์จาก AI ({aiResult?.length || 0} ข้อ)</h2></div>
                <button onClick={() => { setExamModalMode("none"); setPreviewImages([]); }}><X className="size-5"/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {aiResult && aiResult.map((q, idx) => (
                  <div key={idx} className={`border rounded-xl p-4 space-y-2.5 ${q.image_url === "NEEDS_IMAGE" ? "bg-red-50/50 border-red-200" : "bg-slate-50/50 border-slate-200"}`}>
                    
                    {/* 💡 แจ้งเตือนสีแดงในหน้า Preview ผลลัพธ์ AI */}
                    {q.image_url === "NEEDS_IMAGE" && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3 py-1.5 rounded-lg text-[11px] font-bold mb-1 w-fit">
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
                          <div key={optIdx} className={`text-xs p-2 rounded-lg border ${q.correct_index === optIdx ? "bg-green-100 text-green-800 border-green-300 font-bold" : "bg-white text-slate-700"}`}>
                            {choiceLabels[optIdx]} {opt} {q.correct_index === optIdx && "✓ (เฉลย)"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5 pl-4 mt-2 bg-amber-50/70 p-3 rounded-lg border border-amber-100">
                        <p className="text-[11px] font-bold text-amber-900">ช่องคำตอบอัตนัย:</p>
                        {(q.subjective_answers || [""]).map((ans, aIdx) => (
                          <div key={aIdx} className="text-xs bg-white p-2 rounded border text-amber-950 font-mono">ช่องที่ {aIdx + 1}: {ans || "(ว่าง)"}</div>
                        ))}
                      </div>
                    )}

                    {/* กล่องแสดงวิธีทำจาก AI */}
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-800"><Lightbulb className="size-3.5" /> เฉลยและวิธีทำ:</p>
                        <p className="whitespace-pre-line text-slate-700 pl-5">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t mt-4 flex gap-3">
                <button onClick={() => { setManualQuestions(aiResult || []); setExamModalMode("manual"); }} className="flex-1 py-3 border border-primary text-primary font-bold rounded-xl hover:bg-primary/5">แก้ไข/เพิ่มบรรทัดในโหมด Manual</button>
                <button onClick={() => handleSaveExamToDB(aiResult || [])} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow">บันทึกข้อสอบเข้าระบบ</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}