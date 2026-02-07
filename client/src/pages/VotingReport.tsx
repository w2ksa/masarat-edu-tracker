import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function VotingReport() {
  const { data, isLoading } = trpc.getVotingReport.useQuery({});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="container mx-auto">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4">جاري تحميل التقرير...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="container mx-auto">
          <div className="text-center text-white">
            <p>لا توجد بيانات متاحة</p>
          </div>
        </div>
      </div>
    );
  }

  const { report, period } = data;
  const votedCount = report.filter((r: any) => r.hasVoted).length;
  const totalCount = report.length;
  const percentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">تقرير التصويت</h1>
          <p className="text-blue-200">
            الفترة: {new Date(period.startDate).toLocaleDateString('ar-SA')} - {new Date(period.endDate).toLocaleDateString('ar-SA')}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{percentage}%</div>
              <div className="text-blue-200">نسبة المشاركة</div>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-400 mb-2">{votedCount}</div>
              <div className="text-blue-200">صوّتوا</div>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-red-400 mb-2">{totalCount - votedCount}</div>
              <div className="text-blue-200">لم يصوّتوا بعد</div>
            </div>
          </Card>
        </div>

        {/* Teachers List */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">قائمة المعلمين</h2>
          <div className="space-y-4">
            {report.map((teacher: any) => (
              <div
                key={teacher.teacherId}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {teacher.hasVoted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                      <h3 className="text-lg font-semibold text-white">{teacher.teacherName}</h3>
                    </div>

                    {teacher.hasVoted ? (
                      <div className="mr-9">
                        <div className="flex items-center gap-2 text-sm text-blue-200 mb-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {teacher.votedAt
                              ? new Date(teacher.votedAt).toLocaleString('ar-SA', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'غير متوفر'}
                          </span>
                        </div>
                        <div className="text-sm text-white">
                          <span className="text-blue-300 font-medium">صوّت لـ: </span>
                          {teacher.votedStudents.join(' • ')}
                        </div>
                      </div>
                    ) : (
                      <div className="mr-9 text-sm text-red-300">لم يصوّت بعد</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
