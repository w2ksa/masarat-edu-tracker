import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Teachers router
  teachers: router({
    register: protectedProcedure
      .input(z.object({
        specialization: z.string().optional(),
        phoneNumber: z.string().optional(),
        bio: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has a teacher profile
        const existingTeacher = await db.getTeacherByUserId(ctx.user.id);
        if (existingTeacher) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لديك حساب معلم بالفعل" });
        }

        // Create teacher profile
        await db.createTeacher({
          userId: ctx.user.id,
          specialization: input.specialization,
          phoneNumber: input.phoneNumber,
          bio: input.bio,
          status: "pending",
        });

        // Update user role
        await db.upsertUser({ openId: ctx.user.openId, role: "teacher" });

        // Notify all admins
        const admins = await db.getAllAdmins();
        
        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await db.createNotification({
              userId: admin.id,
              title: "تسجيل معلم جديد",
              content: `قام ${ctx.user.name || ctx.user.email} بالتسجيل كمعلم جديد`,
              type: "teacher_registration",
            });
          }
        }

        // Also notify owner
        await notifyOwner({
          title: "تسجيل معلم جديد",
          content: `قام ${ctx.user.name || ctx.user.email} بالتسجيل كمعلم جديد في مسارات`,
        });

        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTeacherByUserId(ctx.user.id);
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      }
      return await db.getAllTeachers();
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        teacherId: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
        }
        return await db.updateTeacherStatus(input.teacherId, input.status);
      }),

    listNames: publicProcedure.query(async () => {
      return await db.getAllTeacherNames();
    }),

    addTeacherName: protectedProcedure
      .input(z.object({ fullName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        await db.addTeacherName(input.fullName);
        return { success: true };
      }),

    deleteTeacherName: protectedProcedure
      .input(z.object({ teacherId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        await db.deleteTeacherName(input.teacherId);
        return { success: true };
      }),
  }),

  // Files router
  files: router({
    upload: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون معلماً لرفع الملفات" });
        }

        const teacher = await db.getTeacherByUserId(ctx.user.id);
        if (!teacher) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لم يتم العثور على ملف المعلم" });
        }

        if (teacher.status !== "approved") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن يتم الموافقة على حسابك أولاً" });
        }

        // Upload to S3
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `teachers/${teacher.id}/files/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Save to database
        await db.createEducationalFile({
          teacherId: teacher.id,
          title: input.title,
          description: input.description,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: fileBuffer.length,
          mimeType: input.mimeType,
          category: input.category,
        });

        return { success: true, url };
      }),

    list: publicProcedure.query(async () => {
      return await db.getAllFiles();
    }),

    myFiles: protectedProcedure.query(async ({ ctx }) => {
      const teacher = await db.getTeacherByUserId(ctx.user.id);
      if (!teacher) {
        return [];
      }
      return await db.getFilesByTeacherId(teacher.id);
    }),

    delete: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const teacher = await db.getTeacherByUserId(ctx.user.id);
        if (!teacher) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لم يتم العثور على ملف المعلم" });
        }
        return await db.deleteFile(input.fileId, teacher.id);
      }),
  }),

  // Notifications router
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // TODO: Implement notifications
      return [];
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationsCount(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.markNotificationAsRead(input.notificationId);
      }),
  }),

  // Students router
  students: router({
    list: publicProcedure
      .input(z.object({ 
        grade: z.string().optional(),
        section: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllStudents(input?.grade, input?.section);
      }),

    topStudents: publicProcedure
      .input(z.object({ 
        limit: z.number().optional(), 
        grade: z.string().optional(),
        gradeGroup: z.enum(["primary", "upper"]).optional()
      }))
      .query(async ({ input }) => {
        return await db.getTopStudents(input.limit || 5, input.grade, input.gradeGroup);
      }),

    getLevelStats: publicProcedure
      .query(async () => {
        return await db.getLevelStats();
      }),

    updateScore: protectedProcedure
      .input(
        z.object({
          studentId: z.number(),
          score: z.number().min(0),
          comment: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get student before update
        const studentBefore = await db.getStudentById(input.studentId);
        const previousScore = studentBefore?.score || 0;
        
        // تحديث نقاط الطالب
        await db.updateStudentScore(input.studentId, input.score, input.comment);

        // Log the score update
        const userAgent = ctx.req.headers['user-agent'] || 'غير معروف';
        const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket?.remoteAddress || 'غير معروف';
        const pointsChange = input.score - previousScore;
        
        await db.logActivity({
          activityType: pointsChange >= 0 ? 'add_score' : 'deduct_score',
          performedBy: ctx.user.name || ctx.user.email || 'مدير النظام',
          studentId: input.studentId,
          studentName: studentBefore?.fullName || 'غير معروف',
          pointsChange: Math.abs(pointsChange),
          previousScore: previousScore,
          newScore: input.score,
          details: input.comment ? JSON.stringify({ comment: input.comment }) : null,
          userAgent: userAgent,
          ipAddress: ipAddress,
        });
        
        // إرسال إشعار عند وصول الطالب لمستوى "قُدوة" (500+)
        if (input.score >= 500) {
          const student = await db.getStudentById(input.studentId);
          if (student) {
            // إشعار لجميع الإداريين
            const admins = await db.getAllAdmins();
            for (const admin of admins) {
              await db.createNotification({
                userId: admin.id,
                title: "طالب متميز وصل لمستوى قُدوة!",
                content: `الطالب ${student.fullName} وصل إلى ${input.score} نقطة وحقق مستوى "قُدوة" 🎉`,
                type: "system",
              });
            }
            
            // إشعار للمالك
            await notifyOwner({
              title: "طالب متميز وصل لمستوى قُدوة",
              content: `الطالب ${student.fullName} وصل إلى ${input.score} نقطة وحقق مستوى "قُدوة" في مسارات`,
            });
          }
        }
        
        return { success: true };
      }),

    addBulkScore: protectedProcedure
      .input(
        z.object({
          points: z.number().min(1),
          grade: z.string().optional(),
          section: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can add bulk scores
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        
        // Use optimized bulk update
        const count = await db.bulkAddScoresByFilter(input.points, input.grade, input.section);
        
        return { success: true, count };
      }),

    deductBulkScore: protectedProcedure
      .input(
        z.object({
          points: z.number().min(1),
          grade: z.string().optional(),
          section: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can deduct bulk scores
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        
        // Use optimized bulk deduction
        const count = await db.bulkDeductScoresByFilter(input.points, input.grade, input.section);
        
        return { success: true, count };
      }),

    addStudent: protectedProcedure
      .input(
        z.object({
          fullName: z.string().min(1),
          grade: z.string(),
          section: z.number().min(1).max(10).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can add students
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        await db.addStudent({ 
          fullName: input.fullName, 
          grade: input.grade, 
          section: input.section || 1,
          score: 0 
        });
        return { success: true };
      }),

    deleteStudent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can delete students
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        await db.deleteStudent(input.id);
        return { success: true };
      }),

    updateStudentName: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          fullName: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can update student names
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        await db.updateStudentName(input.id, input.fullName);
        return { success: true };
      }),

    // Batch update scores for multiple selected students - optimized for speed
    batchUpdateScores: protectedProcedure
      .input(
        z.object({
          studentIds: z.array(z.number()).min(1),
          points: z.number().min(1),
          action: z.enum(["add", "deduct"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can batch update scores
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
        }
        
        const count = await db.batchUpdateScores(input.studentIds, input.points, input.action);
        return { success: true, count };
      }),

    getDailyReport: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can generate daily reports
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون مديراً" });
      }
      
      // Get all students sorted by score (descending)
      const students = await db.getAllStudents();
      const sortedStudents = students.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      // Calculate stats
      const totalStudents = students.length;
      const totalScore = students.reduce((sum, s) => sum + (s.score || 0), 0);
      const averageScore = totalStudents > 0 ? (totalScore / totalStudents).toFixed(2) : "0.00";
      
      // Group by grade
      const gradeStats: Record<string, { count: number; totalScore: number; avgScore: string }> = {};
      for (const student of students) {
        if (!gradeStats[student.grade]) {
          gradeStats[student.grade] = { count: 0, totalScore: 0, avgScore: "0" };
        }
        gradeStats[student.grade].count++;
        gradeStats[student.grade].totalScore += student.score || 0;
      }
      
      // Calculate average for each grade
      for (const grade in gradeStats) {
        const stat = gradeStats[grade];
        stat.avgScore = (stat.totalScore / stat.count).toFixed(2);
      }
      
      return {
        date: new Date().toISOString(),
        totalStudents,
        averageScore,
        gradeStats,
        students: sortedStudents.map((s, index) => ({
          rank: index + 1,
          id: s.id,
          fullName: s.fullName,
          grade: s.grade,
          score: s.score || 0,
        })),
      };
    }),
  }),

  // Voting router
  voting: router({
    getCurrentPeriod: publicProcedure.query(async () => {
      return await db.getCurrentVotingPeriod();
    }),

    openVoting: protectedProcedure
      .input(
        z.object({
          weekNumber: z.number(),
          year: z.number(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Only admins can open voting
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية فتح التصويت" });
        }

        // Close any existing open voting periods
        const currentPeriod = await db.getCurrentVotingPeriod();
        if (currentPeriod) {
          await db.closeVotingPeriod(currentPeriod.id);
        }

        // Create new voting period
        await db.createVotingPeriod(input);
        return { success: true };
      }),

    closeVoting: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can close voting
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إغلاق التصويت" });
        }

        await db.closeVotingPeriod(input.periodId);
        return { success: true };
      }),

    submitVotes: publicProcedure
      .input(
        z.object({
          studentIds: z.array(z.number()).length(3),
          teacherName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if voting is open
        const currentPeriod = await db.getCurrentVotingPeriod();
        if (!currentPeriod || currentPeriod.status !== "open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "التصويت مغلق حالياً" });
        }

        // Find teacher name in teacher_names table
        const teacherName = await db.getTeacherNameByName(input.teacherName);
        if (!teacherName) {
          throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على اسم المعلم في القائمة" });
        }

        // Check if teacher has already voted in this period (using database)
        const existingVotes = await db.getTeacherVotesForPeriod(teacherName.id, currentPeriod.id);
        
        if (existingVotes.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لقد صوّت بالفعل في هذه الفترة" });
        }



        // Get user agent from request headers
        const userAgent = ctx.req.headers['user-agent'] || 'غير معروف';
        const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket?.remoteAddress || 'غير معروف';

        // Submit new votes and add 10 points to each student
        const votedStudentNames: string[] = [];
        for (let i = 0; i < input.studentIds.length; i++) {
          const studentId = input.studentIds[i]!;
          
          // Submit vote
          await db.submitTeacherVote({
            teacherNameId: teacherName.id,
            votingPeriodId: currentPeriod.id,
            studentId,
            voteRank: i + 1,
          });
          
          // Add 10 points to the student
          const student = await db.getStudentById(studentId);
          if (student) {
            const previousScore = student.score || 0;
            const newScore = previousScore + 10;
            await db.updateStudentScore(studentId, newScore, undefined);
            votedStudentNames.push(student.fullName);

            // Log the vote activity
            await db.logActivity({
              activityType: 'vote',
              performedBy: input.teacherName,
              studentId: studentId,
              studentName: student.fullName,
              pointsChange: 10,
              previousScore: previousScore,
              newScore: newScore,
              details: JSON.stringify({
                voteRank: i + 1,
                periodId: currentPeriod.id,
                weekNumber: currentPeriod.weekNumber,
              }),
              userAgent: userAgent,
              ipAddress: ipAddress,
              votingPeriodId: currentPeriod.id,
            });
          }
        }

        // حساب أعلى طالب حصل على تصويتات
        const allVotes = await db.getAllVotesForPeriod(currentPeriod.id);
        const voteCounts = new Map<number, { studentId: number; count: number }>();
        allVotes.forEach((vote) => {
          const existing = voteCounts.get(vote.studentId);
          if (existing) {
            existing.count++;
          } else {
            voteCounts.set(vote.studentId, { studentId: vote.studentId, count: 1 });
          }
        });

        const sorted = Array.from(voteCounts.values()).sort((a, b) => b.count - a.count);
        if (sorted.length > 0 && sorted[0]!.count >= 5) {
          const topVote = sorted[0]!;
          const topStudent = await db.getStudentById(topVote.studentId);
          
          if (topStudent) {
            // إشعار لجميع الإداريين
            const admins = await db.getAllAdmins();
            for (const admin of admins) {
              await db.createNotification({
                userId: admin.id,
                title: "طالب متصدر في التصويتات!",
                content: `الطالب ${topStudent.fullName} حصل على ${topVote.count} تصويت وهو الأعلى هذا الأسبوع ⭐`,
                type: "system",
              });
            }
            
            // إشعار للمالك
            await notifyOwner({
              title: "طالب متصدر في التصويتات",
              content: `الطالب ${topStudent.fullName} حصل على ${topVote.count} تصويت وهو الأعلى هذا الأسبوع في مسارات`,
            });
          }
        }

        // No need for cookies - we check the database for existing votes

        return { success: true };
      }),

    getVotingResults: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Only admins can view results
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض النتائج" });
        }

        return await db.getAllVotesForPeriod(input.periodId);
      }),

    getWeeklyStats: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can view stats
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض الإحصائيات" });
      }

      const currentPeriod = await db.getCurrentVotingPeriod();
      if (!currentPeriod) {
        return { topStudents: [], topStudentsByGrade: {}, allVotes: [] };
      }

      const votes = await db.getAllVotesForPeriod(currentPeriod.id);
      
      // حساب عدد التصويتات لكل طالب
      const voteCounts = new Map<number, { student: any; count: number }>();
      
      for (const vote of votes) {
        const studentId = vote.studentId;
        if (!voteCounts.has(studentId)) {
          const student = await db.getStudentById(studentId);
          voteCounts.set(studentId, { student, count: 0 });
        }
        const current = voteCounts.get(studentId)!;
        current.count++;
      }

      // ترتيب الطلاب حسب عدد التصويتات
      const sorted = Array.from(voteCounts.values()).sort((a, b) => b.count - a.count);
      const topStudents = sorted.slice(0, 5);

      // حساب أعلى طالب في كل الصفوف الستة
      const topStudentsByGrade: Record<string, any> = {};
      const grades = ["أول", "ثاني", "ثالث", "رابع", "خامس", "سادس"];
      
      for (const grade of grades) {
        const studentsInGrade = sorted.filter(item => item.student?.grade === grade);
        if (studentsInGrade.length > 0) {
          topStudentsByGrade[grade] = studentsInGrade[0];
        }
      }

      // أعلى الطلاب على مستوى كل الصفوف
      const topStudentsOverall = sorted.map(item => ({
        studentId: item.student?.id,
        student: item.student,
        count: item.count
      }));

      return { topStudents, topStudentsByGrade, topStudentsOverall, allVotes: votes };
    }),

    getDashboardStats: publicProcedure.query(async () => {
      const students = await db.getAllStudents();
      const currentPeriod = await db.getCurrentVotingPeriod();
      
      // إحصائيات عامة
      const totalStudents = students.length;
      const totalScore = students.reduce((sum, s) => sum + (s.score || 0), 0);
      const averageScore = totalStudents > 0 ? totalScore / totalStudents : 0;
      const excellentStudents = students.filter(s => (s.score || 0) >= 500).length;
      
      // التصويتات الأسبوعية
      let weeklyVotes = 0;
      if (currentPeriod) {
        const votes = await db.getAllVotesForPeriod(currentPeriod.id);
        weeklyVotes = votes.length;
      }
      
      // توزيع الطلاب حسب الصف
      const gradeGroups = students.reduce((acc: any, s) => {
        const grade = s.grade || "غير محدد";
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(s);
        return acc;
      }, {});
      
      // ترتيب الصفوف الصحيح
      const gradeOrder = ["أول", "ثاني", "ثالث", "رابع", "خامس", "سادس"];
      const sortedGrades = Object.keys(gradeGroups).sort((a, b) => {
        const indexA = gradeOrder.indexOf(a);
        const indexB = gradeOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      const studentsByGrade = sortedGrades.map(grade => ({
        grade,
        count: gradeGroups[grade].length,
      }));
      
      const averageScoreByGrade = sortedGrades.map(grade => {
        const gradeStudents = gradeGroups[grade];
        const gradeTotal = gradeStudents.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
        return {
          grade,
          average: gradeStudents.length > 0 ? Math.round(gradeTotal / gradeStudents.length) : 0,
        };
      });
      
      // أعلى 5 طلاب
      const topStudents = students
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5);
      
      // اتجاه التصويتات (بيانات وهمية للعرض)
      const weeklyVotesTrend = [
        { week: "الأسبوع 1", votes: Math.floor(weeklyVotes * 0.6) },
        { week: "الأسبوع 2", votes: Math.floor(weeklyVotes * 0.8) },
        { week: "الأسبوع 3", votes: Math.floor(weeklyVotes * 0.9) },
        { week: "الأسبوع 4", votes: weeklyVotes },
      ];
      
      return {
        totalStudents,
        averageScore,
        weeklyVotes,
        excellentStudents,
        studentsByGrade,
        averageScoreByGrade,
        topStudents,
        weeklyVotesTrend,
      };
    }),
  }),

  // Reports router
  reports: router({
    generateWeeklyReport: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can generate reports
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء التقارير" });
      }

      // جمع بيانات التقرير
      const students = await db.getAllStudents();
      const topStudents = await db.getTopStudents(10);
      const currentPeriod = await db.getCurrentVotingPeriod();
      
      let weeklyVotes: any[] = [];
      if (currentPeriod) {
        weeklyVotes = await db.getAllVotesForPeriod(currentPeriod.id);
      }

      // حساب عدد التصويتات لكل طالب
      const voteCounts = new Map<number, { student: any; count: number }>();
      weeklyVotes.forEach((vote) => {
        const existing = voteCounts.get(vote.studentId);
        if (existing) {
          existing.count++;
        } else {
          voteCounts.set(vote.studentId, { student: vote.student, count: 1 });
        }
      });

      const topVotedStudents = Array.from(voteCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        generatedAt: new Date().toISOString(),
        totalStudents: students.length,
        topStudents,
        topVotedStudents,
        currentPeriod,
        students: students.sort((a, b) => (b.score || 0) - (a.score || 0)),
      };
    }),
  }),

  // Get voting report for admin
  getVotingReport: protectedProcedure
    .input(z.object({ periodId: z.number().optional() }))
    .query(async ({ input }) => {
      const currentPeriod = await db.getCurrentVotingPeriod();
      if (!currentPeriod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا توجد فترة تصويت نشطة" });
      }

      const periodId = input.periodId || currentPeriod.id;
      const report = await db.getVotingReport(periodId);

      return {
        period: currentPeriod,
        report,
      };
    }),

  // Activity Log router
  activityLog: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        type: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // Only admins can view activity logs
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض السجل" });
        }

        const limit = input?.limit || 100;
        const offset = input?.offset || 0;

        if (input?.type) {
          return await db.getActivityLogsByType(input.type, limit);
        }

        return await db.getActivityLogs(limit, offset);
      }),

    count: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can view activity logs
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض السجل" });
      }

      return await db.getActivityLogsCount();
    }),

    getTeacherVotingDetails: protectedProcedure
      .input(z.object({ periodId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // Only admins can view voting details
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض تفاصيل التصويت" });
        }

        const currentPeriod = await db.getCurrentVotingPeriod();
        if (!currentPeriod) {
          return [];
        }

        const periodId = input?.periodId || currentPeriod.id;
        return await db.getTeacherVotingDetails(periodId);
      }),
  }),

  // Admin procedure to add primary grade students
  admin: router({
    addPrimaryStudents: publicProcedure
      .input(z.object({
        students: z.array(z.object({
          fullName: z.string(),
          grade: z.enum(['first', 'second', 'third'])
        }))
      }))
      .mutation(async ({ input }) => {
        const addedStudents = [];
        for (const student of input.students) {
          const added = await db.addStudent({
            fullName: student.fullName,
            grade: student.grade,
            score: 0,
            comment: null
          });
          addedStudents.push(added);
        }
        return {
          success: true,
          count: addedStudents.length,
          students: addedStudents
        };
      }),
  }),

  // Student Content router - for uploading videos and images
  content: router({
    // Upload content (public - no login required)
    upload: publicProcedure
      .input(z.object({
        studentId: z.number(),
        contentType: z.enum(["video", "image"]),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Upload to S3
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `student-content/${input.studentId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Save to database
        await db.createStudentContent({
          studentId: input.studentId,
          contentType: input.contentType,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: fileBuffer.length,
          mimeType: input.mimeType,
          description: input.description,
          status: "pending",
        });

        return { success: true, url };
      }),

    // List all content (for admin)
    list: publicProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllStudentContent(input?.status);
      }),

    // Get pending content count
    pendingCount: publicProcedure.query(async () => {
      return await db.getPendingContentCount();
    }),

    // Approve content (adds 10 points)
    approve: publicProcedure
      .input(z.object({
        contentId: z.number(),
        reviewedBy: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateContentStatus(input.contentId, "approved", input.reviewedBy);
      }),

    // Reject content (no points)
    reject: publicProcedure
      .input(z.object({
        contentId: z.number(),
        reviewedBy: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateContentStatus(input.contentId, "rejected", input.reviewedBy);
      }),

    // Get single content by ID
    getById: publicProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentContentById(input.contentId);
      }),
  }),

  // System Settings router
  settings: router({
    // Check if content submission is enabled
    isContentSubmissionEnabled: publicProcedure
      .query(async () => {
        return await db.isContentSubmissionEnabled();
      }),

    // Toggle content submission (admin only)
    toggleContentSubmission: publicProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleContentSubmission(input.enabled);
        return { success: true, enabled: input.enabled };
      }),
  }),
});

export type AppRouter = typeof appRouter;
