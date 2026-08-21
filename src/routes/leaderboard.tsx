import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { ChevronLeft, Trophy, Medal, Loader2, Star, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

const SUBJECTS = [
  { id: "math", name: "คณิตศาสตร์", color: "text-blue-600", bg: "bg-blue-100" },
  { id: "science", name: "วิทยาศาสตร์", color: "text-emerald-600", bg: "bg-emerald-100" },
  { id: "english", name: "ภาษาอังกฤษ", color: "text-rose-600", bg: "bg-rose-100" },
  { id: "thai", name: "ภาษาไทย", color: "text-amber-600", bg: "bg-amber-100" },
  { id: "social", name: "สังคมศึกษา", color: "text-purple-600", bg: "bg-purple-100" },
];

function LeaderboardPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState("math");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserEmail(session.user.email || null);
      }

      // ดึงข้อมูลนักเรียนทั้งหมดมาเพื่อจัดอันดับ
      const { data, error } = await supabase.from("students").select("name, email, scores");
      if (error) throw error;
      
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="size-8 animate-spin mb-4 text-primary" />
          <p>กำลังโหลดข้อมูลกระดานจัดอันดับ...</p>
        </div>
      </PageShell>
    );
  }

  // คำนวณและเรียงลำดับคะแนนตามวิชาที่เลือก (ใช้คะแนน % ล่าสุดที่บันทึกไว้)
  const rankedStudents = students
    .map(s => ({
      name: s.name,
      email: s.email,
      score: s.scores?.[activeSubject] || 0
    }))
    // กรองเอาเฉพาะคนที่มีคะแนนมากกว่า 0 (เคยสอบวิชานี้แล้ว)
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // หาอันดับของตัวเอง
  const currentUserRankIndex = rankedStudents.findIndex(s => s.email === currentUserEmail);
  const currentUserData = currentUserRankIndex !== -1 ? rankedStudents[currentUserRankIndex] : null;

  return (
    <PageShell>
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ChevronLeft className="size-4" /> กลับหน้าหลัก
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 sm:p-4 rounded-full bg-amber-100 text-amber-500 mb-2 shadow-sm">
            <Trophy className="size-10 sm:size-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800">
            Hall of Fame
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            กระดานจัดอันดับนักเรียนที่มีคะแนนยอดเยี่ยมในแต่ละรายวิชา ฝึกฝนบ่อยๆ เพื่อขึ้นเป็นที่ 1!
          </p>
        </div>

        {/* เมนูเลือกวิชา */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {SUBJECTS.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubject(sub.id)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeSubject === sub.id
                  ? `${sub.bg} ${sub.color} shadow-sm ring-1 ring-${sub.color.replace('text-', '')}/50 scale-105`
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* กระดานอันดับ */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          {/* อันดับของตัวเอง (ถ้ามี) */}
          {currentUserData && (
            <div className="bg-slate-800 p-5 text-white flex items-center justify-between sm:px-8">
              <div className="flex items-center gap-4">
                <div className="size-10 sm:size-12 rounded-full bg-slate-700 flex items-center justify-center font-black text-lg border border-slate-600">
                  {currentUserRankIndex + 1}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold mb-0.5">อันดับของคุณ</p>
                  <p className="font-bold text-sm sm:text-base">{currentUserData.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-black text-amber-400">{currentUserData.score}<span className="text-sm font-medium text-slate-400 ml-1">%</span></p>
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {rankedStudents.length > 0 ? (
              <div className="space-y-3">
                {rankedStudents.map((student, index) => {
                  const isTop3 = index < 3;
                  const isCurrentUser = student.email === currentUserEmail;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                        isCurrentUser ? "bg-primary/10 border-primary/30 border ring-1 ring-primary/20" : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`size-10 sm:size-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${
                          index === 0 ? "bg-gradient-to-br from-yellow-300 to-amber-500 text-white" :
                          index === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-white" :
                          index === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white" :
                          "bg-white text-slate-600 border border-slate-200"
                        }`}>
                          {index === 0 ? <CrownIcon /> : index + 1}
                        </div>
                        <div>
                          <p className={`font-bold text-sm sm:text-base flex items-center gap-2 ${isCurrentUser ? "text-primary" : "text-slate-800"}`}>
                            {student.name}
                            {isCurrentUser && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-semibold">คุณ</span>}
                          </p>
                          {isTop3 && <p className="text-xs font-semibold text-amber-600 mt-0.5 flex items-center gap-1"><Star className="size-3 fill-amber-500" /> Top {index + 1}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl sm:text-2xl font-black ${isTop3 ? "text-slate-800" : "text-slate-600"}`}>
                          {student.score}
                          <span className="text-sm font-medium text-slate-400 ml-1">%</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <TrendingUp className="size-12 mb-3 opacity-20" />
                <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลคะแนนในวิชานี้</p>
                <p className="text-sm mt-1">เริ่มทำข้อสอบเพื่อเป็นคนแรกในกระดานผู้นำสิ!</p>
                <Link to="/programs" className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition shadow-sm">
                  ไปที่คลังข้อสอบ
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// Custom Crown Icon for 1st Place
function CrownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  );
}