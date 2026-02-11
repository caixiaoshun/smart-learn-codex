import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireTeacher, requireStudent } from '../middleware/auth';

const router = Router();

// 获取班级作业分析（教师）
router.get('/class/:classId/homeworks', authenticate, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    // 验证班级归属
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: true,
          },
        },
        homeworks: {
          include: {
            submissions: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权访问此班级数据' });
    }

    const studentCount = classData.students.length;

    // 分析每个作业
    const homeworkAnalysis = classData.homeworks.map(hw => {
      const submissions = hw.submissions;
      const submittedCount = submissions.length;
      const notSubmittedCount = studentCount - submittedCount;
      const submissionRate = studentCount > 0 ? Math.round((submittedCount / studentCount) * 100) : 0;

      // 成绩统计
      const scoredSubmissions = submissions.filter((s): s is typeof s & { score: number } => s.score !== null);
      const scores = scoredSubmissions.map(s => s.score);

      return {
        id: hw.id,
        title: hw.title,
        deadline: hw.deadline,
        maxScore: hw.maxScore,
        statistics: {
          totalStudents: studentCount,
          submitted: submittedCount,
          notSubmitted: notSubmittedCount,
          submissionRate,
          scoredCount: scoredSubmissions.length,
          notScoredCount: submittedCount - scoredSubmissions.length,
          ...(scores.length > 0 && {
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          }),
        },
      };
    });

    res.json({
      class: {
        id: classData.id,
        name: classData.name,
        studentCount,
      },
      homeworks: homeworkAnalysis,
    });
  } catch (error) {
    console.error('获取班级作业分析失败:', error);
    res.status(500).json({ error: '获取班级作业分析失败' });
  }
});

// 获取作业成绩分布（教师）
router.get('/homework/:homeworkId/distribution', authenticate, requireTeacher, async (req, res) => {
  try {
    const { homeworkId } = req.params;

    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: {
          include: {
            students: {
              include: {
                student: true,
              },
            },
          },
        },
        submissions: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!homework) {
      return res.status(404).json({ error: '作业不存在' });
    }

    if (homework.class.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权访问此作业数据' });
    }

    const maxScore = homework.maxScore;
    const scoredSubmissions = homework.submissions.filter((s): s is typeof s & { score: number } => s.score !== null);
    const scores = scoredSubmissions.map(s => s.score);

    // 分数段分布
    const ranges = [
      { label: '优秀 (90-100%)', min: maxScore * 0.9, max: maxScore, count: 0 },
      { label: '良好 (80-89%)', min: maxScore * 0.8, max: maxScore * 0.9, count: 0 },
      { label: '中等 (70-79%)', min: maxScore * 0.7, max: maxScore * 0.8, count: 0 },
      { label: '及格 (60-69%)', min: maxScore * 0.6, max: maxScore * 0.7, count: 0 },
      { label: '不及格 (<60%)', min: 0, max: maxScore * 0.6, count: 0 },
    ];

    scores.forEach(score => {
      const range = ranges.find(r => score >= r.min && score < r.max);
      if (range) range.count++;
      // 满分特殊情况
      if (score === maxScore) {
        const topRange = ranges.find(r => r.label.includes('90-100'));
        if (topRange) topRange.count++;
      }
    });

    res.json({
      homework: {
        id: homework.id,
        title: homework.title,
        maxScore,
      },
      distribution: ranges.map(r => ({
        label: r.label,
        count: r.count,
        percentage: scores.length > 0 ? Math.round((r.count / scores.length) * 100) : 0,
      })),
      statistics: {
        totalStudents: homework.class.students.length,
        submitted: homework.submissions.length,
        notSubmitted: homework.class.students.length - homework.submissions.length,
        submissionRate: homework.class.students.length > 0
          ? Math.round((homework.submissions.length / homework.class.students.length) * 100)
          : 0,
        ...(scores.length > 0 && {
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
          averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          medianScore: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
        }),
      },
      submissions: homework.submissions.map(s => ({
        id: s.id,
        studentName: s.student.name,
        score: s.score,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (error) {
    console.error('获取成绩分布失败:', error);
    res.status(500).json({ error: '获取成绩分布失败' });
  }
});

// 获取学生个人成绩走势（学生）
router.get('/student/trend', authenticate, requireStudent, async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: req.user!.userId,
        score: { not: null },
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            deadline: true,
            maxScore: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const trend = submissions.map(s => ({
      homeworkId: s.homework.id,
      homeworkTitle: s.homework.title,
      deadline: s.homework.deadline,
      score: s.score,
      maxScore: s.homework.maxScore,
      percentage: s.homework.maxScore > 0 && s.score !== null ? Math.round((s.score / s.homework.maxScore) * 100) : 0,
      submittedAt: s.submittedAt,
    }));

    // 计算统计数据
    const scores = trend.map(t => t.percentage);

    res.json({
      trend,
      statistics: {
        totalSubmitted: submissions.length,
        averagePercentage: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
        highestPercentage: scores.length > 0 ? Math.max(...scores) : 0,
        lowestPercentage: scores.length > 0 ? Math.min(...scores) : 0,
        trendDirection: scores.length >= 2
          ? (scores[scores.length - 1] > scores[0] ? 'up' : scores[scores.length - 1] < scores[0] ? 'down' : 'stable')
          : 'stable',
      },
    });
  } catch (error) {
    console.error('获取成绩走势失败:', error);
    res.status(500).json({ error: '获取成绩走势失败' });
  }
});

// 获取学生个人成绩走势（教师查看）
router.get('/student/:studentId/trend', authenticate, requireTeacher, async (req, res) => {
  try {
    const { studentId } = req.params;

    // 验证学生是否属于该教师的班级
    const memberships = await prisma.classStudent.findMany({
      where: { studentId },
      include: {
        class: true,
        student: true,
      },
    });

    if (memberships.length === 0) {
      return res.status(404).json({ error: '学生不存在或未加入班级' });
    }

    const hasAccess = memberships.some(m => m.class.teacherId === req.user!.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: '无权查看此学生数据' });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        score: { not: null },
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            deadline: true,
            maxScore: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const trend = submissions.map(s => ({
      homeworkId: s.homework.id,
      homeworkTitle: s.homework.title,
      deadline: s.homework.deadline,
      score: s.score,
      maxScore: s.homework.maxScore,
      percentage: s.homework.maxScore > 0 && s.score !== null ? Math.round((s.score / s.homework.maxScore) * 100) : 0,
      submittedAt: s.submittedAt,
    }));

    const scores = trend.map(t => t.percentage);

    res.json({
      student: {
        id: memberships[0].student.id,
        name: memberships[0].student.name,
        email: memberships[0].student.email,
      },
      trend,
      statistics: {
        totalSubmitted: submissions.length,
        averagePercentage: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
        highestPercentage: scores.length > 0 ? Math.max(...scores) : 0,
        lowestPercentage: scores.length > 0 ? Math.min(...scores) : 0,
      },
    });
  } catch (error) {
    console.error('获取学生成绩走势失败:', error);
    res.status(500).json({ error: '获取学生成绩走势失败' });
  }
});

// 获取班级整体统计（教师）
router.get('/class/:classId/overview', authenticate, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: true,
          },
        },
        homeworks: {
          include: {
            submissions: {
              include: {
                student: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权访问此班级数据' });
    }

    const studentCount = classData.students.length;
    const homeworkCount = classData.homeworks.length;

    // 计算总体提交率
    let totalSubmissions = 0;
    const totalExpected = studentCount * homeworkCount;
    classData.homeworks.forEach(hw => {
      totalSubmissions += hw.submissions.length;
    });

    const overallSubmissionRate = totalExpected > 0
      ? Math.round((totalSubmissions / totalExpected) * 100)
      : 0;

    // 计算平均分
    let totalScore = 0;
    let scoredCount = 0;
    classData.homeworks.forEach(hw => {
      hw.submissions.forEach(sub => {
        if (sub.score !== null) {
          totalScore += sub.score;
          scoredCount++;
        }
      });
    });

    const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    // 学生排名
    const studentScores: { id: string; name: string; totalScore: number; submissionCount: number }[] = [];

    const studentList = classData.students.map(s => s.student);

    for (const student of studentList) {
      let studentTotalScore = 0;
      let studentScoredCount = 0;
      let studentSubmissionCount = 0;

      for (const hw of classData.homeworks) {
        const sub = hw.submissions.find(s => s.studentId === student.id);
        if (sub) {
          studentSubmissionCount++;
          if (sub.score !== null) {
            studentTotalScore += sub.score;
            studentScoredCount++;
          }
        }
      }

      studentScores.push({
        id: student.id,
        name: student.name,
        totalScore: studentScoredCount > 0 ? Math.round(studentTotalScore / studentScoredCount) : 0,
        submissionCount: studentSubmissionCount,
      });
    }

    // 按平均分排序
    studentScores.sort((a, b) => b.totalScore - a.totalScore);

    res.json({
      class: {
        id: classData.id,
        name: classData.name,
        studentCount,
        homeworkCount,
      },
      overview: {
        overallSubmissionRate,
        averageScore,
        totalSubmissions,
        totalExpected,
      },
      topStudents: studentScores.slice(0, 10),
      needAttention: studentScores
        .filter(s => s.submissionCount < homeworkCount * 0.5)
        .slice(0, 5),
    });
  } catch (error) {
    console.error('获取班级概览失败:', error);
    res.status(500).json({ error: '获取班级概览失败' });
  }
});

export default router;
