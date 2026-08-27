import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { ChevronLeft, Trophy, Loader2, TrendingUp, Crown } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

const SUBJECTS = [
  { id: "math", name: "คณิตศาสตร์", color: "text-blue-600", activeBg: "bg-blue-600 text-white" },
  { id: "science", name: "วิทยาศาสตร์", color: "text-emerald-600", activeBg: "bg-emerald-600 text-white" },
  { id: "english", name: "ภาษาอังกฤษ", color: "text-rose-600", activeBg: "bg-rose-600 text-white" },
  { id: "thai", name: "ภาษาไทย", color: "text-amber-600", activeBg: "bg-amber-600 text-white" },
  { id: "social", name: "สังคมศึกษา", color: "text-purple-600", activeBg: "bg-purple-600 text-white" },
  { id: "aptitude_math", name: "ความถนัดทางคณิตฯ", color: "text-cyan-600", activeBg: "bg-cyan-600 text-white" },
  { id: "aptitude_eng", name: "ทักษะภาษาอังกฤษ", color: "text-fuchsia-600", activeBg: "bg-fuchsia-600 text-white" },
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

      const { data, error } = await supabase
        .from("students")
        .select("id, name, email, scores");

      if (error) throw error;

      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const rankedStudents = useMemo(() => {
    return students
      .map((s) => ({
        id: s.id,
        name: s.name || "นักเรียน",
        email: s.email,
        score: Number(s.scores?.[activeSubject]) || 0,
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [students, activeSubject]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold">กำลังประมวลผลกระดานจัดอันดับ...</p>
        </div>
      </PageShell>
    );
  }

  const currentUserRankIndex = rankedStudents.findIndex((s) => s.email === currentUserEmail);
  const currentUserData = currentUserRankIndex !== -1 ? rankedStudents[currentUserRankIndex] : null;

  const top1 = rankedStudents[0];
  const top2 = rankedStudents[1];
  const top3 = rankedStudents[2];
  const otherRanks = rankedStudents.slice(3);

  return (
    <PageShell>
      <div className="relative isolate overflow-hidden pb-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 -translate-x-1/2 blur-3xl opacity-50">
          <div className="h-72 w-[600px] bg-gradient-to-r from-amber-200 via-yellow-300 to-teal-200 rounded-full" />
        </div>

        {/* Navigation Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors">
            <ChevronLeft className="size-4" /> กลับหน้าหลัก
          </Link>
        </nav>

        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-b from-amber-100 to-amber-200 text-amber-600 shadow-[0_4px_0_0_#d97706] mb-2">
            <Trophy className="size-10 text-amber-600" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">Hall of Fame</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            ตารางจัดอันดับนักเรียนที่มีผลคะแนนยอดเยี่ยมสูงสุดในแต่ละวิชา (เฉพาะการสอบรอบแรก)
          </p>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-4xl mx-auto">
          {SUBJECTS.map((sub) => {
            const active = activeSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubject(sub.id)}
                className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                  active
                    ? `${sub.activeBg} shadow-md scale-105`
                    : "bg-white/80 backdrop-blur-md text-slate-600 border border-slate-200 hover:bg-white"
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>

        {/* Current User Floating Banner */}
        {currentUserData && (
          <div className="max-w-3xl mx-auto mb-8 backdrop-blur-xl bg-slate-900/90 text-white p-5 sm:px-8 rounded-3xl shadow-xl flex items-center justify-between border border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 flex items-center justify-center font-black text-lg shadow-inner">
                #{currentUserRankIndex + 1}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">อันดับปัจจุบันของคุณ</p>
                <p className="font-black text-base text-white">{currentUserData.name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-400">{currentUserData.score}</span>
              <span className="text-xs text-slate-400 ml-1 font-bold">%</span>
            </div>
          </div>
        )}

        {/* 3D Podium for Top 3 */}
        {rankedStudents.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end pt-8 pb-4">
              {/* Rank 2 */}
              <div className="flex flex-col items-center">
                {top2 ? (
                  <>
                    <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-400 text-white flex items-center justify-center font-black text-xl shadow-[0_4px_0_0_#94a3b8] mb-2">
                      2
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-slate-800 text-center line-clamp-1">{top2.name}</p>
                    <p className="text-xs font-black text-slate-500 mt-0.5">{top2.score}%</p>
                    <div className="w-full h-24 sm:h-28 rounded-t-3xl bg-gradient-to-t from-slate-200/80 to-slate-100 border border-slate-200 mt-3 shadow-inner" />
                  </>
                ) : (
                  <div className="w-full h-24 rounded-t-3xl bg-slate-100/50" />
                )}
              </div>

              {/* Rank 1 */}
              <div className="flex flex-col items-center -translate-y-2">
                {top1 ? (
                  <>
                    <Crown className="size-8 text-amber-500 fill-amber-400 mb-1 animate-bounce" />
                    <div className="size-16 sm:size-20 rounded-3xl bg-gradient-to-b from-yellow-300 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-[0_5px_0_0_#b45309] mb-2">
                      1
                    </div>
                    <p className="font-black text-sm sm:text-base text-slate-900 text-center line-clamp-1">{top1.name}</p>
                    <p className="text-sm font-black text-amber-600 mt-0.5">{top1.score}%</p>
                    <div className="w-full h-32 sm:h-36 rounded-t-3xl bg-gradient-to-t from-amber-200 to-amber-100 border border-amber-300 mt-3 shadow-inner" />
                  </>
                ) : null}
              </div>

              {/* Rank 3 */}
              <div className="flex flex-col items-center">
                {top3 ? (
                  <>
                    <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-b from-orange-300 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-[0_4px_0_0_#c2410c] mb-2">
                      3
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-slate-800 text-center line-clamp-1">{top3.name}</p>
                    <p className="text-xs font-black text-orange-600 mt-0.5">{top3.score}%</p>
                    <div className="w-full h-16 sm:h-20 rounded-t-3xl bg-gradient-to-t from-orange-100 to-orange-50 border border-orange-200 mt-3 shadow-inner" />
                  </>
                ) : (
                  <div className="w-full h-16 rounded-t-3xl bg-slate-100/50" />
                )}
              </div>
            </div>

            {/* Other Ranks */}
            {otherRanks.length > 0 && (
              <div className="backdrop-blur-xl bg-white/80 border border-white/90 rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.04)] space-y-2.5">
                {otherRanks.map((student, idx) => {
                  const actualRank = idx + 4;
                  const isCurrent = student.email === currentUserEmail;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                        isCurrent
                          ? "bg-primary/10 border border-primary/30 font-bold"
                          : "bg-white/70 border border-slate-100 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="size-9 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 flex items-center justify-center">
                          {actualRank}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-slate-800">
                            {student.name} {isCurrent && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full ml-1 font-bold">คุณ</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-base font-black text-slate-700">{student.score}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto py-16 text-center text-slate-400 backdrop-blur-xl bg-white/60 border border-white/80 rounded-3xl p-8 shadow-sm">
            <TrendingUp className="size-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold text-slate-700 text-base">ยังไม่มีคะแนนในวิชานี้</p>
            <p className="text-xs text-slate-500 mt-1">เป็นคนแรกที่ทำข้อสอบเพื่อขึ้นเป็นอันดับที่ 1 ของกระดาน!</p>
            <Link
              to="/programs"
              className="mt-6 inline-block px-6 py-3 bg-primary text-white font-bold text-xs rounded-2xl shadow-[0_4px_0_0_#0f766e] active:translate-y-0.5 active:shadow-none transition"
            >
              ไปทำข้อสอบเลย
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}