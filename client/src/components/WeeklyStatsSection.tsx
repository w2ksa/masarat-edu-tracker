import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Medal, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const GRADE_COLORS = {
  "أول": "#f59e0b",
  "ثاني": "#10b981", 
  "ثالث": "#3b82f6",
  "رابع": "#8b5cf6",
  "خامس": "#ec4899",
  "سادس": "#ef4444"
};

const RANK_COLORS = ["#fbbf24", "#94a3b8", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#ef4444"];

export function WeeklyStatsSection() {
  // @ts-ignore
  const { data: weeklyStats, isLoading } = trpc.voting.getWeeklyStats.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // @ts-ignore - جلب جميع الطلاب مرتبين حسب النقاط الكلية
  const { data: allStudents } = trpc.students.list.useQuery({ grade: undefined }, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // @ts-ignore
  const topStudentsOverall = (weeklyStats as any)?.topStudentsOverall || [];

  // ترتيب جميع الطلاب حسب النقاط الكلية
  const sortedStudents = [...(allStudents || [])].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  // بيانات الرسم البياني العمودي - أعلى 8 طلاب مصوت لهم
  const barChartData = topStudentsOverall.slice(0, 8).map((item: any) => ({
    name: item.student?.fullName?.split(" ").slice(0, 2).join(" ") || "غير معروف",
    votes: item.count || 0,
    grade: item.student?.grade || ""
  }));

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-slate-400 text-lg">جاري التحميل...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = topStudentsOverall.length > 0;

  return (
    <div className="space-y-8">
      {/* العنوان الرئيسي */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-8 py-4 rounded-2xl border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            تصويتات الأسبوع
          </h2>
          <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <p className="text-slate-400 mt-3 text-lg">أعلى الطلاب المصوت لهم هذا الأسبوع</p>
      </div>

      {!hasData ? (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="py-16">
            <div className="text-center text-slate-400">
              <Trophy className="w-20 h-20 mx-auto mb-4 opacity-30" />
              <p className="text-2xl font-bold">لا توجد تصويتات حتى الآن</p>
              <p className="text-slate-500 mt-2">سيتم عرض التصويتات هنا عند بدء المعلمين بالتصويت</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* القسم الرئيسي: يسار (المتصدرون) + يمين (الرسم البياني) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* النصف الأيسر: أعلى الطلاب المصوت لهم */}
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900 border-slate-700 shadow-xl">
              <CardHeader className="border-b border-slate-700/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <Medal className="w-6 h-6 text-yellow-500" />
                  أعلى الطلاب المصوت لهم
                </CardTitle>
                <CardDescription className="text-slate-400">ترتيب الطلاب حسب عدد التصويتات هذا الأسبوع</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topStudentsOverall.slice(0, 10).map((item: any, index: number) => {
                  const student = item.student;
                  const color = GRADE_COLORS[student?.grade as keyof typeof GRADE_COLORS] || "#6b7280";
                  const rankColor = RANK_COLORS[index] || "#6b7280";
                  const isTop3 = index < 3;
                  
                  return (
                    <div 
                      key={student?.id || index}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] border ${
                        isTop3 ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent' :
                        'border-slate-700/50 bg-slate-800/30'
                      }`}
                    >
                      {/* رقم الترتيب */}
                      <div 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-slate-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                      
                      {/* اسم الطالب والصف */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold truncate ${isTop3 ? 'text-white' : 'text-slate-200'}`}>
                          {student?.fullName || "غير معروف"}
                        </div>
                        <div className="text-xs text-slate-500">
                          الصف {student?.grade} {student?.section ? `- الفصل ${student?.section}` : ''}
                        </div>
                      </div>
                      
                      {/* شارة الصف */}
                      <div 
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: `${color}30`, color: color }}
                      >
                        {student?.grade}
                      </div>
                      
                      {/* عدد التصويتات */}
                      <Badge 
                        className={`text-sm px-3 py-1 font-bold shadow-lg ${
                          isTop3 ? 'bg-yellow-500 text-black' : 'bg-blue-600'
                        }`}
                      >
                        {item.count} تصويت
                      </Badge>
                    </div>
                  );
                })}
                
                {topStudentsOverall.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <Medal className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد تصويتات حتى الآن</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* النصف الأيمن: الرسم البياني */}
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900 border-slate-700 shadow-xl">
              <CardHeader className="border-b border-slate-700/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                  رسم بياني للتصويتات
                </CardTitle>
                <CardDescription className="text-slate-400">توزيع التصويتات على الطلاب</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={barChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8" }} />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fill: "#e2e8f0", fontSize: 12 }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                        formatter={(value: number) => [`${value} تصويت`, "التصويتات"]}
                      />
                      <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                        {barChartData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS] || "#3b82f6"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400 py-16">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>لا توجد بيانات للعرض</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* قسم ترتيب جميع الطلاب حسب النقاط الكلية */}
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900 border-slate-700 shadow-xl">
            <CardHeader className="border-b border-slate-700/50 pb-4">
              <CardTitle className="flex items-center gap-3 text-white text-xl">
                <Users className="w-6 h-6 text-green-500" />
                ترتيب جميع الطلاب حسب النقاط الكلية
              </CardTitle>
              <CardDescription className="text-slate-400">
                ترتيب الطلاب من الأعلى للأقل حسب مجموع النقاط الفعلية ({sortedStudents.length} طالب)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {sortedStudents.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2">
                  {sortedStudents.map((student: any, index: number) => {
                    const color = GRADE_COLORS[student.grade as keyof typeof GRADE_COLORS] || "#6b7280";
                    const isTop3 = index < 3;
                    const isTop10 = index < 10;
                    
                    return (
                      <div 
                        key={student.id}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:scale-[1.01] border ${
                          isTop3 ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent' :
                          isTop10 ? 'border-blue-500/30 bg-slate-800/50' :
                          'border-slate-700/50 bg-slate-800/30'
                        }`}
                      >
                        {/* رقم الترتيب */}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-slate-400 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                        
                        {/* اسم الطالب */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold truncate ${isTop3 ? 'text-white' : 'text-slate-200'}`}>
                            {student.fullName}
                          </div>
                          <div className="text-xs text-slate-500">
                            الصف {student.grade} {student.section ? `- الفصل ${student.section}` : ''}
                          </div>
                        </div>
                        
                        {/* شارة الصف */}
                        <div 
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: `${color}30`, color: color }}
                        >
                          {student.grade}
                        </div>
                        
                        {/* النقاط */}
                        <div className={`text-left min-w-[80px] ${isTop3 ? 'text-yellow-400' : 'text-slate-300'}`}>
                          <div className="font-bold text-lg">{student.score || 0}</div>
                          <div className="text-xs text-slate-500">نقطة</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-16">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>لا يوجد طلاب</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
