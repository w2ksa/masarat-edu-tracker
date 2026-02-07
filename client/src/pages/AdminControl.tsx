import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Vote, TrendingUp, Search, Plus, Minus, Check, X, ArrowRight, FileText, BarChart3, Trash2, History, Image, ToggleLeft, ToggleRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { StudentDetailsDialog } from "@/components/StudentDetailsDialog";
import { WeeklyStatsSection } from "@/components/WeeklyStatsSection";
import { ReportExport } from "@/components/ReportExport";
import { DailyReportButton } from "@/components/DailyReportButton";
import type { Student } from "../../../drizzle/schema";

export default function AdminControl() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("__all__");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [isBulkScoreDialogOpen, setIsBulkScoreDialogOpen] = useState(false);
  const [isBulkDeductDialogOpen, setIsBulkDeductDialogOpen] = useState(false);
  const [bulkScoreInput, setBulkScoreInput] = useState("");
  const [bulkDeductInput, setBulkDeductInput] = useState("");
  const [bulkGrade, setBulkGrade] = useState<string | undefined>(undefined);
  const [bulkSection, setBulkSection] = useState<number | undefined>(undefined);
  const [bulkDeductGrade, setBulkDeductGrade] = useState<string | undefined>(undefined);
  const [bulkDeductSection, setBulkDeductSection] = useState<number | undefined>(undefined);
  
  // Teacher management states
  const [newTeacherName, setNewTeacherName] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  
  // Multi-select students states
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isMultiSelectDialogOpen, setIsMultiSelectDialogOpen] = useState(false);
  const [multiSelectAction, setMultiSelectAction] = useState<"add" | "deduct">("add");
  const [multiSelectScore, setMultiSelectScore] = useState("");

  // Level details dialog state
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Check authentication - check localStorage first, then sessionStorage
  useEffect(() => {
    const role = localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
    const isAuth = localStorage.getItem("isAuthenticated") || sessionStorage.getItem("isAuthenticated");
    
    if (role !== "admin" || isAuth !== "true") {
      toast.error("يجب تسجيل الدخول كمدير نظام");
      setLocation("/login");
    } else {
      // Sync to sessionStorage for this session
      sessionStorage.setItem("userRole", role);
      sessionStorage.setItem("isAuthenticated", isAuth);
    }
  }, [setLocation]);

  const { data: students, isLoading: studentsLoading } = trpc.students.list.useQuery({ grade: selectedGrade });
  const { data: topStudents } = trpc.students.topStudents.useQuery({ limit: 5, grade: selectedGrade });
  const { data: votingStatus } = trpc.voting.getCurrentPeriod.useQuery();
  const { data: levelStats } = trpc.students.getLevelStats.useQuery();
  const { data: teacherNames, isLoading: teachersLoading } = trpc.teachers.listNames.useQuery();
  
  // Content submission settings
  const { data: isContentEnabled } = trpc.settings.isContentSubmissionEnabled.useQuery();
  const toggleContentMutation = trpc.settings.toggleContentSubmission.useMutation({
    onSuccess: (data) => {
      utils.settings.isContentSubmissionEnabled.invalidate();
      toast.success(data.enabled ? "تم تفعيل إرسال المحتوى" : "تم تعطيل إرسال المحتوى");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateScoreMutation = trpc.students.updateScore.useMutation({
    onSuccess: () => {
      utils.students.list.invalidate();
      utils.students.topStudents.invalidate();
      toast.success("تم تحديث النقاط بنجاح");
      setIsScoreDialogOpen(false);
      setSelectedStudent(null);
      setScoreInput("");
      setCommentInput("");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث النقاط");
    },
  });

  const openVotingMutation = trpc.voting.openVoting.useMutation({
    onSuccess: () => {
      utils.voting.getCurrentPeriod.invalidate();
      toast.success("تم فتح التصويت بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء فتح التصويت");
    },
  });

  const closeVotingMutation = trpc.voting.closeVoting.useMutation({
    onSuccess: () => {
      utils.voting.getCurrentPeriod.invalidate();
      toast.success("تم إغلاق التصويت بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إغلاق التصويت");
    },
  });

  const addBulkScoreMutation = trpc.students.addBulkScore.useMutation({
    onSuccess: (data) => {
      utils.students.list.invalidate();
      toast.success(`تم إضافة النقاط لـ ${data.count} طالب بنجاح`);
      setIsBulkScoreDialogOpen(false);
      setBulkScoreInput("");
      setBulkGrade(undefined);
      setBulkSection(undefined);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة النقاط");
    },
  });

  // @ts-ignore - API exists in server
  const deductBulkScoreMutation = trpc.students.deductBulkScore.useMutation({
    onSuccess: (data: any) => {
      utils.students.list.invalidate();
      toast.success(`تم خصم النقاط من ${data.count} طالب بنجاح`);
      setIsBulkDeductDialogOpen(false);
      setBulkDeductInput("");
      setBulkDeductGrade(undefined);
      setBulkDeductSection(undefined);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء خصم النقاط");
    },
  });

  // @ts-ignore - API exists in server
  const addTeacherMutation = trpc.teachers.addTeacherName.useMutation({
    onSuccess: () => {
      utils.teachers.listNames.invalidate();
      toast.success("تم إضافة المعلم بنجاح");
      setNewTeacherName("");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المعلم");
    },
  });

  // @ts-ignore - API exists in server
  const deleteTeacherMutation = trpc.teachers.deleteTeacherName.useMutation({
    onSuccess: () => {
      utils.teachers.listNames.invalidate();
      toast.success("تم حذف المعلم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المعلم");
    },
  });

  const handleLogout = () => {
    sessionStorage.clear();
    toast.success("تم تسجيل الخروج بنجاح");
    setLocation("/");
  };

  const handleUpdateScore = () => {
    if (!selectedStudent || !scoreInput) {
      toast.error("يرجى إدخال النقاط");
      return;
    }

    const score = parseInt(scoreInput);
    if (isNaN(score) || score < 0) {
      toast.error("يرجى إدخال نقاط صحيحة (أكبر من أو يساوي 0)");
      return;
    }

    updateScoreMutation.mutate({
      studentId: selectedStudent,
      score,
      comment: commentInput.trim() || undefined,
    });
  };

  const handleAddBulkScore = () => {
    if (!bulkScoreInput) {
      toast.error("يرجى إدخال عدد النقاط");
      return;
    }

    const points = parseInt(bulkScoreInput);
    if (isNaN(points) || points < 1) {
      toast.error("يرجى إدخال عدد صحيح (أكبر من 0)");
      return;
    }

    addBulkScoreMutation.mutate({
      points,
      grade: bulkGrade === "__all__" ? undefined : bulkGrade,
      section: bulkSection,
    });
  };

  const handleDeductBulkScore = () => {
    if (!bulkDeductInput) {
      toast.error("يرجى إدخال عدد النقاط");
      return;
    }

    const points = parseInt(bulkDeductInput);
    if (isNaN(points) || points < 1) {
      toast.error("يرجى إدخال عدد صحيح (أكبر من 0)");
      return;
    }

    deductBulkScoreMutation.mutate({
      points,
      grade: bulkDeductGrade === "__all__" ? undefined : bulkDeductGrade,
      section: bulkDeductSection,
    });
  };

  const handleAddTeacher = () => {
    if (!newTeacherName.trim()) {
      toast.error("يرجى إدخال اسم المعلم");
      return;
    }
    addTeacherMutation.mutate({ fullName: newTeacherName.trim() });
  };

  const handleDeleteTeacher = (teacherId: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المعلم؟")) {
      deleteTeacherMutation.mutate({ teacherId });
    }
  };

  const handleOpenVoting = () => {
    const now = new Date();
    const weekNumber = Math.ceil((now.getDate()) / 7);
    const year = now.getFullYear();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    openVotingMutation.mutate({
      weekNumber,
      year,
      startDate: now,
      endDate,
    });
  };

  const handleCloseVoting = () => {
    if (votingStatus?.id) {
      closeVotingMutation.mutate({ periodId: votingStatus.id });
    }
  };

  const filteredStudents = students?.filter(student =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTeachers = teacherNames?.filter(teacher =>
    teacher.fullName.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  ) || [];

  const isVotingOpen = votingStatus?.status === "open";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">لوحة التحكم الإدارية</h1>
                <p className="text-xs md:text-sm text-slate-300">مسارات - ابتدائية أبها الأهلية</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-full md:w-[180px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">كل الصفوف</SelectItem>
                  <SelectItem value="أول">الصف الأول الابتدائي</SelectItem>
                  <SelectItem value="ثاني">الصف الثاني الابتدائي</SelectItem>
                  <SelectItem value="ثالث">الصف الثالث الابتدائي</SelectItem>
                  <SelectItem value="رابع">الصف الرابع الابتدائي</SelectItem>
                  <SelectItem value="خامس">الصف الخامس الابتدائي</SelectItem>
                  <SelectItem value="سادس">الصف السادس الابتدائي</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button variant="ghost" onClick={() => setLocation("/admin/students")} className="text-purple-400 hover:text-purple-300 flex-1 md:flex-none text-sm">
                  <Users className="w-4 h-4 ml-2" />
                  إدارة الطلاب
                </Button>
                <Button variant="ghost" onClick={() => setLocation("/admin/activity-log")} className="text-amber-400 hover:text-amber-300 flex-1 md:flex-none text-sm">
                  <History className="w-4 h-4 ml-2" />
                  سجل التعديلات
                </Button>
                <Button variant="ghost" onClick={() => setLocation("/admin/content")} className={`${isContentEnabled ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'} flex-1 md:flex-none text-sm`}>
                  <Image className="w-4 h-4 ml-2" />
                  إدارة المحتوى
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => toggleContentMutation.mutate({ enabled: !isContentEnabled })}
                  className={`${isContentEnabled ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'} flex-1 md:flex-none text-sm`}
                  disabled={toggleContentMutation.isPending}
                >
                  {isContentEnabled ? (
                    <><ToggleRight className="w-4 h-4 ml-2" /> إرسال المحتوى: مفعل</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4 ml-2" /> إرسال المحتوى: معطل</>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setLocation("/")} className="text-slate-300 flex-1 md:flex-none text-sm">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  العودة للرئيسية
                </Button>
                <Button variant="outline" onClick={handleLogout} className="flex-1 md:flex-none text-sm">
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
            <TabsTrigger value="students" className="text-xs md:text-sm">
              <Users className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">إدارة الطلاب</span>
              <span className="sm:hidden">طلاب</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="text-xs md:text-sm">
              <Users className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">إدارة المعلمين</span>
              <span className="sm:hidden">معلمين</span>
            </TabsTrigger>
            <TabsTrigger value="voting" className="text-xs md:text-sm">
              <Vote className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              التصويت
            </TabsTrigger>
            <TabsTrigger value="weekly-stats" className="text-xs md:text-sm">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">تصويتات الأسبوع</span>
              <span className="sm:hidden">الأسبوع</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs md:text-sm">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              المتصدرون
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs md:text-sm">
              <FileText className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
              التقارير
            </TabsTrigger>
          </TabsList>

          {/* Students Management Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>إدارة نقاط الطلاب</CardTitle>
                    <CardDescription>يمكنك تعديل نقاط أي طالب من هنا</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Multi-Select Action Button */}
                    {selectedStudents.length > 0 && (
                      <Button
                        onClick={() => setIsMultiSelectDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                      >
                        <Check className="ml-2 h-4 w-4" />
                        عملية لـ {selectedStudents.length} طالب
                      </Button>
                    )}
                    {/* Bulk Add Score Dialog */}
                    <Dialog open={isBulkScoreDialogOpen} onOpenChange={setIsBulkScoreDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none">
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة جماعية
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>إضافة نقاط جماعية للطلاب</DialogTitle>
                          <DialogDescription>
                            أضف نقاط لجميع الطلاب أو لصف أو فصل محدد
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bulk-points">عدد النقاط</Label>
                            <Input
                              id="bulk-points"
                              type="number"
                              min="1"
                              value={bulkScoreInput}
                              onChange={(e) => setBulkScoreInput(e.target.value)}
                              placeholder="مثلاً: 10 أو 20 أو 30"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bulk-grade">الصف (اختياري)</Label>
                            <Select value={bulkGrade} onValueChange={setBulkGrade}>
                              <SelectTrigger>
                                <SelectValue placeholder="جميع الصفوف" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">جميع الصفوف</SelectItem>
                                <SelectItem value="أول">الأول الابتدائي</SelectItem>
                                <SelectItem value="ثاني">الثاني الابتدائي</SelectItem>
                                <SelectItem value="ثالث">الثالث الابتدائي</SelectItem>
                                <SelectItem value="رابع">الرابع الابتدائي</SelectItem>
                                <SelectItem value="خامس">الخامس الابتدائي</SelectItem>
                                <SelectItem value="سادس">السادس الابتدائي</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="bulk-section">الفصل (اختياري)</Label>
                            <Select value={bulkSection?.toString()} onValueChange={(v) => setBulkSection(v === "__all__" ? undefined : parseInt(v))}>
                              <SelectTrigger>
                                <SelectValue placeholder="جميع الفصول" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">جميع الفصول</SelectItem>
                                <SelectItem value="1">فصل أ</SelectItem>
                                <SelectItem value="2">فصل ب</SelectItem>
                                <SelectItem value="3">فصل ج</SelectItem>
                                <SelectItem value="4">فصل د</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddBulkScore}
                              disabled={addBulkScoreMutation.isPending}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {addBulkScoreMutation.isPending ? "جاري الإضافة..." : "إضافة النقاط"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsBulkScoreDialogOpen(false)}
                              className="flex-1"
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Bulk Deduct Score Dialog */}
                    <Dialog open={isBulkDeductDialogOpen} onOpenChange={setIsBulkDeductDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none">
                          <Minus className="ml-2 h-4 w-4" />
                          خصم جماعي
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>خصم نقاط جماعي من الطلاب</DialogTitle>
                          <DialogDescription>
                            اخصم نقاط من جميع الطلاب أو من صف أو فصل محدد
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="deduct-points">عدد النقاط للخصم</Label>
                            <Input
                              id="deduct-points"
                              type="number"
                              min="1"
                              value={bulkDeductInput}
                              onChange={(e) => setBulkDeductInput(e.target.value)}
                              placeholder="مثلاً: 5 أو 10 أو 20"
                            />
                          </div>
                          <div>
                            <Label htmlFor="deduct-grade">الصف (اختياري)</Label>
                            <Select value={bulkDeductGrade} onValueChange={setBulkDeductGrade}>
                              <SelectTrigger>
                                <SelectValue placeholder="جميع الصفوف" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">جميع الصفوف</SelectItem>
                                <SelectItem value="أول">الأول الابتدائي</SelectItem>
                                <SelectItem value="ثاني">الثاني الابتدائي</SelectItem>
                                <SelectItem value="ثالث">الثالث الابتدائي</SelectItem>
                                <SelectItem value="رابع">الرابع الابتدائي</SelectItem>
                                <SelectItem value="خامس">الخامس الابتدائي</SelectItem>
                                <SelectItem value="سادس">السادس الابتدائي</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="deduct-section">الفصل (اختياري)</Label>
                            <Select value={bulkDeductSection?.toString()} onValueChange={(v) => setBulkDeductSection(v === "__all__" ? undefined : parseInt(v))}>
                              <SelectTrigger>
                                <SelectValue placeholder="جميع الفصول" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">جميع الفصول</SelectItem>
                                <SelectItem value="1">فصل أ</SelectItem>
                                <SelectItem value="2">فصل ب</SelectItem>
                                <SelectItem value="3">فصل ج</SelectItem>
                                <SelectItem value="4">فصل د</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleDeductBulkScore}
                              disabled={deductBulkScoreMutation.isPending}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              {deductBulkScoreMutation.isPending ? "جاري الخصم..." : "خصم النقاط"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsBulkDeductDialogOpen(false)}
                              className="flex-1"
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث عن طالب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
                ) : (
                  <div className="grid gap-3 max-h-[600px] overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border-2 ${
                          selectedStudents.includes(student.id)
                            ? "border-blue-500 bg-blue-900/30"
                            : "border-slate-700 bg-slate-800/50"
                        } hover:border-slate-600 transition-all gap-3`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                              }
                            }}
                            className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                          />
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition-colors flex-1"
                            onClick={() => {
                              setSelectedStudentDetails(student);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <span className="text-white font-medium text-base">{student.fullName}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <Badge variant="secondary" className="text-base sm:text-lg px-3 sm:px-4 py-1">
                            {student.score} نقطة
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student.id);
                              setScoreInput(student.score.toString());
                              setCommentInput(student.comment || "");
                              setIsScoreDialogOpen(true);
                            }}
                            className="text-sm"
                          >
                            تعديل
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teachers Management Tab */}
          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المعلمين</CardTitle>
                <CardDescription>يمكنك إضافة وحذف المعلمين من هنا - عدد المعلمين الحالي: {teacherNames?.length || 0}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add Teacher Form */}
                  <div className="p-6 rounded-lg bg-slate-800/50 border-2 border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">إضافة معلم جديد</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="أدخل اسم المعلم الكامل..."
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddTeacher}
                          disabled={addTeacherMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          {addTeacherMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setNewTeacherName("")}
                        >
                          <X className="w-4 h-4 ml-2" />
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Teachers List */}
                  <div className="p-6 rounded-lg bg-slate-800/50 border-2 border-slate-700">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <h3 className="text-lg font-semibold text-white">قائمة المعلمين ({teacherNames?.length || 0})</h3>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="ابحث عن معلم..."
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          className="pr-10 bg-slate-700 border-slate-600"
                        />
                      </div>
                    </div>
                    
                    {teachersLoading ? (
                      <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
                    ) : filteredTeachers.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        {teacherSearchQuery ? "لا توجد نتائج للبحث" : "لا يوجد معلمين مضافين بعد"}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredTeachers.map((teacher, index) => (
                          <div 
                            key={teacher.id} 
                            className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 text-sm w-8">{index + 1}.</span>
                              <p className="text-white font-medium">{teacher.fullName}</p>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              disabled={deleteTeacherMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voting Management Tab */}
          <TabsContent value="voting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة التصويت الأسبوعي</CardTitle>
                <CardDescription>
                  تحكم في فتح وإغلاق التصويت للمعلمين
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-6 rounded-lg bg-slate-800/50 border-2 border-slate-700">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      حالة التصويت الحالية
                    </h3>
                    <Badge variant={isVotingOpen ? "default" : "secondary"} className="text-base">
                      {isVotingOpen ? "مفتوح" : "مغلق"}
                    </Badge>
                    {votingStatus && isVotingOpen && (
                      <p className="text-sm text-slate-400 mt-2">
                        ينتهي في: {new Date(votingStatus.endDate).toLocaleDateString("ar-SA")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isVotingOpen ? (
                      <Button
                        variant="destructive"
                        onClick={handleCloseVoting}
                        disabled={closeVotingMutation.isPending}
                      >
                        <X className="w-4 h-4 ml-2" />
                        إغلاق التصويت
                      </Button>
                    ) : (
                      <Button
                        onClick={handleOpenVoting}
                        disabled={openVotingMutation.isPending}
                      >
                        <Check className="w-4 h-4 ml-2" />
                        فتح تصويت جديد
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700">
                  <h4 className="font-semibold text-white mb-2">ملاحظة:</h4>
                  <p className="text-sm text-slate-300">
                    عند فتح التصويت، سيتمكن المعلمون من اختيار 3 طلاب لمدة أسبوع. يمكنك إغلاق التصويت في أي وقت.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Stats Tab */}
          <TabsContent value="weekly-stats" className="space-y-6">
            <WeeklyStatsSection />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            {/* Level Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  إحصائيات المستويات
                </CardTitle>
                <CardDescription>عدد الطلاب في كل مستوى</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* قُدوة */}
                  <div 
                    className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg p-4 text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedLevel('qudwa'); setIsLevelDialogOpen(true); }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">👑</div>
                      <div className="text-2xl font-bold mb-1">{levelStats?.qudwa?.count || 0}</div>
                      <div className="text-sm font-semibold">قُدوة</div>
                      <div className="text-xs opacity-90 mt-1">500+ نقطة</div>
                    </div>
                  </div>
                  
                  {/* مُتميز */}
                  <div 
                    className="bg-gradient-to-br from-orange-600 to-red-600 rounded-lg p-4 text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedLevel('mutamayiz'); setIsLevelDialogOpen(true); }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">⭐</div>
                      <div className="text-2xl font-bold mb-1">{levelStats?.mutamayiz?.count || 0}</div>
                      <div className="text-sm font-semibold">مُتميز</div>
                      <div className="text-xs opacity-90 mt-1">400-499 نقطة</div>
                    </div>
                  </div>
                  
                  {/* مُنضبط */}
                  <div 
                    className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-lg p-4 text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedLevel('mundabit'); setIsLevelDialogOpen(true); }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-2xl font-bold mb-1">{levelStats?.mundabit?.count || 0}</div>
                      <div className="text-sm font-semibold">مُنضبط</div>
                      <div className="text-xs opacity-90 mt-1">300-399 نقطة</div>
                    </div>
                  </div>
                  
                  {/* مُجتهد */}
                  <div 
                    className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg p-4 text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedLevel('mujtahid'); setIsLevelDialogOpen(true); }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">📚</div>
                      <div className="text-2xl font-bold mb-1">{levelStats?.mujtahid?.count || 0}</div>
                      <div className="text-sm font-semibold">مُجتهد</div>
                      <div className="text-xs opacity-90 mt-1">200-299 نقطة</div>
                    </div>
                  </div>
                  
                  {/* قادر */}
                  <div 
                    className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg p-4 text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedLevel('qadir'); setIsLevelDialogOpen(true); }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">🌱</div>
                      <div className="text-2xl font-bold mb-1">{levelStats?.qadir?.count || 0}</div>
                      <div className="text-sm font-semibold">مُبادر</div>
                      <div className="text-xs opacity-90 mt-1">100-199 نقطة</div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">اضغط على أي مستوى لعرض الطلاب</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-yellow-500" />
                  المتصدرون - أعلى 5 طلاب
                </CardTitle>
                <CardDescription>الطلاب الأعلى نقاطاً في التحصيل الدراسي</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topStudents?.map((student, index) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        index === 0
                          ? "border-yellow-500 bg-yellow-500/10"
                          : index === 1
                          ? "border-slate-400 bg-slate-400/10"
                          : index === 2
                          ? "border-orange-600 bg-orange-600/10"
                          : "border-slate-700 bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0
                              ? "bg-yellow-500 text-black"
                              : index === 1
                              ? "bg-slate-400 text-black"
                              : index === 2
                              ? "bg-orange-600 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-white font-medium text-lg">{student.fullName}</span>
                      </div>
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        {student.score} نقطة
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>التقارير</CardTitle>
                <CardDescription>عرض التقارير والإحصائيات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setLocation("/admin/voting-report")}
                  className="w-full"
                  variant="outline"
                >
                  <Vote className="w-4 h-4 ml-2" />
                  تقرير التصويت
                </Button>
                <ReportExport />
                <DailyReportButton />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Score Update Dialog */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل نقاط الطالب</DialogTitle>
            <DialogDescription>
              {selectedStudent && students?.find(s => s.id === selectedStudent)?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="score">النقاط الجديدة</Label>
              <Input
                id="score"
                type="number"
                min="0"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="أدخل النقاط"
              />
            </div>
            <div>
              <Label htmlFor="comment">تعليق من مدير النظام (اختياري)</Label>
              <Input
                id="comment"
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateScore}
                disabled={updateScoreMutation.isPending}
                className="flex-1"
              >
                {updateScoreMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsScoreDialogOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        student={selectedStudentDetails}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      {/* Multi-Select Action Dialog */}
      <Dialog open={isMultiSelectDialogOpen} onOpenChange={setIsMultiSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>عملية للطلاب المختارين</DialogTitle>
            <DialogDescription>
              تم اختيار {selectedStudents.length} طالب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>نوع العملية</Label>
              <Select value={multiSelectAction} onValueChange={(v: "add" | "deduct") => setMultiSelectAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">زيادة نقاط</SelectItem>
                  <SelectItem value="deduct">خصم نقاط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="multi-score">عدد النقاط</Label>
              <Input
                id="multi-score"
                type="number"
                min="1"
                value={multiSelectScore}
                onChange={(e) => setMultiSelectScore(e.target.value)}
                placeholder="مثلاً: 5 أو 10 أو 20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const points = parseInt(multiSelectScore);
                  if (isNaN(points) || points < 1) {
                    toast.error("يرجى إدخال عدد صحيح");
                    return;
                  }
                  
                  try {
                    // Use optimized batch update - single database query
                    // @ts-ignore - API exists in server
                    await (trpc.students.batchUpdateScores as any).mutate({
                      studentIds: selectedStudents,
                      points,
                      action: multiSelectAction
                    });
                    
                    utils.students.list.invalidate();
                    utils.students.topStudents.invalidate();
                    toast.success(`تم ${multiSelectAction === "add" ? "إضافة" : "خصم"} ${points} نقطة لـ ${selectedStudents.length} طالب بنجاح`);
                  } catch (error) {
                    // Fallback to individual updates if batch fails
                    selectedStudents.forEach(studentId => {
                      const student = students?.find(s => s.id === studentId);
                      if (student) {
                        const newScore = multiSelectAction === "add" 
                          ? student.score + points 
                          : Math.max(0, student.score - points);
                        updateScoreMutation.mutate({
                          studentId,
                          score: newScore,
                          comment: student.comment
                        });
                      }
                    });
                    toast.success(`تم ${multiSelectAction === "add" ? "إضافة" : "خصم"} ${points} نقطة لـ ${selectedStudents.length} طالب`);
                  }
                  
                  setIsMultiSelectDialogOpen(false);
                  setSelectedStudents([]);
                  setMultiSelectScore("");
                }}
                className="flex-1"
              >
                {multiSelectAction === "add" ? "إضافة" : "خصم"} النقاط
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsMultiSelectDialogOpen(false);
                  setMultiSelectScore("");
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Students Dialog */}
      <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLevel === 'qudwa' && <>👑 طلاب مستوى قُدوة (500+ نقطة)</>}
              {selectedLevel === 'mutamayiz' && <>⭐ طلاب مستوى مُتميز (400-499 نقطة)</>}
              {selectedLevel === 'mundabit' && <>⚡ طلاب مستوى مُنضبط (300-399 نقطة)</>}
              {selectedLevel === 'mujtahid' && <>📚 طلاب مستوى مُجتهد (200-299 نقطة)</>}
              {selectedLevel === 'qadir' && <>🌱 طلاب مستوى مُبادر (100-199 نقطة)</>}
              {selectedLevel === 'mubtadi' && <>📖 طلاب مستوى مبتدئ (0-99 نقطة)</>}
            </DialogTitle>
            <DialogDescription>
              قائمة الطلاب في هذا المستوى مرتبة حسب النقاط
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedLevel && levelStats && (levelStats as any)[selectedLevel]?.students?.length > 0 ? (
              (levelStats as any)[selectedLevel].students.map((student: any, index: number) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-xs text-slate-500">الصف {student.grade} {student.section ? `- الفصل ${student.section}` : ''}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {student.score} نقطة
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>لا يوجد طلاب في هذا المستوى</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
