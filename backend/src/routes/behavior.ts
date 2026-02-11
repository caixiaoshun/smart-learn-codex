import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireTeacher, requireStudent } from '../middleware/auth';

const router = Router();

// 记录学生行为日志（学生）
router.post('/', authenticate, requireStudent, async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(['PAGE_VIEW', 'RESOURCE_VIEW', 'CASE_VIEW', 'HOMEWORK_SUBMIT', 'AI_CHAT']),
      duration: z.number().int().min(0).default(0),
      metadata: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const log = await prisma.behaviorLog.create({
      data: {
        studentId: req.user!.userId,
        type: data.type,
        duration: data.duration,
        metadata: data.metadata,
      },
    });

    res.status(201).json({ message: '行为记录成功', log });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('记录行为日志失败:', error);
    res.status(500).json({ error: '记录行为日志失败' });
  }
});

// 获取当前学生的行为日志
router.get('/my', authenticate, requireStudent, async (req, res) => {
  try {
    const { type, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = { studentId: req.user!.userId };
    if (type) {
      where.type = String(type);
    }

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.behaviorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.behaviorLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取行为日志失败:', error);
    res.status(500).json({ error: '获取行为日志失败' });
  }
});

// 获取教师所有学生的行为数据汇总（教师）
router.get('/teacher/students', authenticate, requireTeacher, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // 获取教师的所有班级及其学生
    const classes = await prisma.class.findMany({
      where: { teacherId: userId },
      include: {
        students: {
          include: {
            student: { select: { id: true, name: true, avatar: true } },
          },
        },
        homeworks: {
          include: { submissions: true },
        },
      },
    });

    // 收集所有唯一学生
    const studentMap = new Map<string, { id: string; name: string; avatar: string | null }>();
    for (const cls of classes) {
      for (const cs of cls.students) {
        if (!studentMap.has(cs.studentId)) {
          studentMap.set(cs.studentId, cs.student);
        }
      }
    }

    const studentIds = [...studentMap.keys()];

    // 聚合行为日志数据
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 获取最近30天行为日志
    const behaviorLogs = await prisma.behaviorLog.findMany({
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { studentId: true, type: true, duration: true, createdAt: true },
    });

    // 获取 AI 聊天消息数
    const chatCounts = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds }, role: 'user' },
      _count: { id: true },
    });
    const chatCountMap = new Map(chatCounts.map(c => [c.userId, c._count.id]));

    // 构建每个学生的行为数据
    const students = [];
    for (const [studentId, student] of studentMap) {
      // 计算提交率（作为 quizAvg 的近似）
      let totalHomeworks = 0;
      let submittedCount = 0;
      let earnedScore = 0;
      let totalMaxScore = 0;

      for (const cls of classes) {
        const isInClass = cls.students.some(s => s.studentId === studentId);
        if (!isInClass) continue;

        for (const hw of cls.homeworks) {
          totalHomeworks++;
          const submission = hw.submissions.find(s => s.studentId === studentId);
          if (submission) {
            submittedCount++;
            earnedScore += submission.score ?? 0;
            totalMaxScore += hw.maxScore;
          }
        }
      }

      const quizAvg = totalMaxScore > 0
        ? Math.round((earnedScore / totalMaxScore) * 100)
        : 0;

      // 编程时长（来自行为日志，转换为小时）
      const studentLogs = behaviorLogs.filter(l => l.studentId === studentId);
      const codingSeconds = studentLogs
        .filter(l => l.type === 'RESOURCE_VIEW' || l.type === 'CASE_VIEW')
        .reduce((sum, l) => sum + l.duration, 0);
      const codingHours = Math.round((codingSeconds / 3600) * 10) / 10;

      // 讨论区活跃度（AI 聊天消息数）
      const discussionPosts = chatCountMap.get(studentId) ?? 0;

      // 最近活动时间
      const lastLog = [...studentLogs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const lastActive = lastLog
        ? formatRelativeTime(lastLog.createdAt)
        : '无记录';

      // 风险评估
      const submissionRate = totalHomeworks > 0 ? submittedCount / totalHomeworks : 0;
      const chatCount = chatCountMap.get(studentId) ?? 0;
      const aiScore = Math.min(1, Math.log2(chatCount + 1) / Math.log2(50));
      const behaviorScore = submissionRate * 60 + aiScore * 40;

      let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      if (behaviorScore < 50) {
        riskLevel = 'HIGH';
      } else if (behaviorScore < 80) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      students.push({
        id: studentId,
        studentId,
        studentName: student.name,
        avatar: student.avatar,
        quizAvg,
        codingHours,
        discussionPosts,
        lastActive,
        riskLevel,
      });
    }

    res.json({ students });
  } catch (error) {
    console.error('获取学生行为数据失败:', error);
    res.status(500).json({ error: '获取学生行为数据失败' });
  }
});

// 获取指定学生的行为统计（教师）
router.get('/stats/:studentId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { studentId } = req.params;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 按类型聚合
    const typeStats = await prisma.behaviorLog.groupBy({
      by: ['type'],
      where: {
        studentId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _sum: { duration: true },
    });

    // 按天聚合（近30天）
    const logs = await prisma.behaviorLog.findMany({
      where: {
        studentId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { duration: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // 按天分组
    const dailyMap: Record<string, number> = {};
    for (const log of logs) {
      const day = new Date(log.createdAt).toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] ?? 0) + log.duration;
    }

    const dailyStats = Object.entries(dailyMap).map(([date, totalDuration]) => ({
      date,
      totalDuration,
    }));

    res.json({ typeStats, dailyStats });
  } catch (error) {
    console.error('获取学生行为统计失败:', error);
    res.status(500).json({ error: '获取学生行为统计失败' });
  }
});

// 辅助函数：相对时间格式化
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}

export default router;
