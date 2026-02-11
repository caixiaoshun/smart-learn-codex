import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireTeacher, requireStudent } from '../middleware/auth';

const router = Router();

// ========== 课堂问答 & 知识分享记录 ==========

// 教师创建平时表现记录
router.post('/record', authenticate, requireTeacher, async (req, res) => {
  try {
    const schema = z.object({
      classId: z.string().min(1),
      studentId: z.string().min(1),
      type: z.enum(['CLASSROOM_QA', 'KNOWLEDGE_SHARE']),
      topic: z.string().max(200).optional(),
      score: z.number().int().min(1).max(5).optional(), // 1-5 表现等级
      notes: z.string().max(500).optional(),
      evidence: z.string().optional(), // JSON: 链接或附件路径
      duration: z.number().int().min(0).optional(), // 知识分享时长（分钟）
      occurredAt: z.string().datetime().optional(),
    });
    const data = schema.parse(req.body);

    // 验证班级归属
    const classData = await prisma.class.findUnique({
      where: { id: data.classId },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权操作该班级' });
    }

    // 验证学生在班级中
    const membership = await prisma.classStudent.findUnique({
      where: {
        studentId_classId: {
          studentId: data.studentId,
          classId: data.classId,
        },
      },
    });

    if (!membership) {
      return res.status(400).json({ error: '该学生不在该班级中' });
    }

    const record = await prisma.classPerformanceRecord.create({
      data: {
        classId: data.classId,
        studentId: data.studentId,
        type: data.type,
        topic: data.topic,
        score: data.score,
        notes: data.notes,
        evidence: data.evidence,
        duration: data.duration,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        recordedById: req.user!.userId,
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.status(201).json({ message: '记录创建成功', record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('创建记录失败:', error);
    res.status(500).json({ error: '创建记录失败' });
  }
});

// 获取班级平时表现记录列表
router.get('/records/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { type, studentId } = req.query;

    const where: any = { classId };
    if (type) where.type = type;
    if (studentId) where.studentId = studentId;

    const records = await prisma.classPerformanceRecord.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });

    res.json({ records });
  } catch (error) {
    console.error('获取记录列表失败:', error);
    res.status(500).json({ error: '获取记录列表失败' });
  }
});

// 删除平时表现记录
router.delete('/record/:id', authenticate, requireTeacher, async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.classPerformanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    if (record.recordedById !== req.user!.userId) {
      return res.status(403).json({ error: '无权删除此记录' });
    }

    await prisma.classPerformanceRecord.delete({ where: { id } });

    res.json({ message: '记录删除成功' });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ error: '删除记录失败' });
  }
});

// 平时表现统计汇总
router.get('/summary/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    // 获取班级所有学生
    const students = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    // 获取所有记录
    const records = await prisma.classPerformanceRecord.findMany({
      where: { classId },
    });

    // 按学生汇总
    const summary = students.map(s => {
      const studentRecords = records.filter(r => r.studentId === s.studentId);
      const qaRecords = studentRecords.filter(r => r.type === 'CLASSROOM_QA');
      const shareRecords = studentRecords.filter(r => r.type === 'KNOWLEDGE_SHARE');

      const qaAvgScore = qaRecords.length > 0
        ? qaRecords.reduce((sum, r) => sum + (r.score || 0), 0) / qaRecords.length
        : 0;
      const shareAvgScore = shareRecords.length > 0
        ? shareRecords.reduce((sum, r) => sum + (r.score || 0), 0) / shareRecords.length
        : 0;

      return {
        student: s.student,
        qaCount: qaRecords.length,
        qaAvgScore: Math.round(qaAvgScore * 10) / 10,
        shareCount: shareRecords.length,
        shareAvgScore: Math.round(shareAvgScore * 10) / 10,
        totalRecords: studentRecords.length,
        // 默认权重: 课堂问答40% + 知识分享30% + 平均30%
        compositeScore: Math.round((qaAvgScore * 0.4 + shareAvgScore * 0.3) * 20 * 10) / 10,
      };
    });

    res.json({ summary });
  } catch (error) {
    console.error('获取统计汇总失败:', error);
    res.status(500).json({ error: '获取统计汇总失败' });
  }
});

// 导出平时表现记录
router.get('/export/:classId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.params;
    const format = (req.query.format as string) || 'csv';

    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权导出该班级数据' });
    }

    const records = await prisma.classPerformanceRecord.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ studentId: 'asc' }, { occurredAt: 'desc' }],
    });

    if (format === 'csv') {
      const csvHeaders = ['学号', '姓名', '邮箱', '类型', '主题', '得分', '备注', '发生时间'] as const;
      const typeMap: Record<string, string> = {
        CLASSROOM_QA: '课堂问答',
        KNOWLEDGE_SHARE: '知识分享',
      };
      const csvContent = [
        csvHeaders.join(','),
        ...records.map(r => [
          `"${r.student.id.slice(0, 8)}"`,
          `"${r.student.name}"`,
          `"${r.student.email}"`,
          `"${typeMap[r.type] || r.type}"`,
          `"${r.topic || '-'}"`,
          `"${r.score ?? '-'}"`,
          `"${r.notes || '-'}"`,
          `"${r.occurredAt.toISOString()}"`,
        ].join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="平时表现_${classData.name}.csv"`);
      res.send('\uFEFF' + csvContent);
    } else {
      res.json({ records });
    }
  } catch (error) {
    console.error('导出记录失败:', error);
    res.status(500).json({ error: '导出记录失败' });
  }
});

// ========== 知识点自评 ==========

// 教师发布知识点清单
router.post('/knowledge-points', authenticate, requireTeacher, async (req, res) => {
  try {
    const schema = z.object({
      classId: z.string().min(1),
      points: z.array(z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })).min(1, '请至少添加一个知识点'),
    });
    const { classId, points } = schema.parse(req.body);

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }
    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权操作该班级' });
    }

    const created = [];
    for (let i = 0; i < points.length; i++) {
      const kp = await prisma.knowledgePoint.create({
        data: {
          classId,
          title: points[i].title,
          description: points[i].description,
          orderIndex: i,
        },
      });
      created.push(kp);
    }

    res.status(201).json({ message: '知识点清单发布成功', knowledgePoints: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('发布知识点失败:', error);
    res.status(500).json({ error: '发布知识点失败' });
  }
});

// 获取知识点清单
router.get('/knowledge-points/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const points = await prisma.knowledgePoint.findMany({
      where: { classId },
      include: {
        _count: { select: { assessments: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.json({ knowledgePoints: points });
  } catch (error) {
    console.error('获取知识点清单失败:', error);
    res.status(500).json({ error: '获取知识点清单失败' });
  }
});

// 学生提交知识点自评
router.post('/knowledge-assessment', authenticate, requireStudent, async (req, res) => {
  try {
    const schema = z.object({
      assessments: z.array(z.object({
        knowledgePointId: z.string().min(1),
        masteryLevel: z.number().int().min(1).max(5),
        selfNote: z.string().max(500).optional(),
      })).min(1),
    });
    const { assessments } = schema.parse(req.body);

    const results = [];
    for (const a of assessments) {
      const result = await prisma.knowledgePointAssessment.upsert({
        where: {
          knowledgePointId_studentId: {
            knowledgePointId: a.knowledgePointId,
            studentId: req.user!.userId,
          },
        },
        update: {
          masteryLevel: a.masteryLevel,
          selfNote: a.selfNote,
        },
        create: {
          knowledgePointId: a.knowledgePointId,
          studentId: req.user!.userId,
          masteryLevel: a.masteryLevel,
          selfNote: a.selfNote,
        },
      });
      results.push(result);
    }

    res.json({ message: '知识点自评提交成功', assessments: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('提交知识点自评失败:', error);
    res.status(500).json({ error: '提交知识点自评失败' });
  }
});

// 获取学生的知识点自评
router.get('/knowledge-assessment/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { classId },
      include: {
        assessments: {
          where: { studentId: req.user!.userId },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.json({ knowledgePoints });
  } catch (error) {
    console.error('获取知识点自评失败:', error);
    res.status(500).json({ error: '获取知识点自评失败' });
  }
});

// 教师查看知识点自评分布
router.get('/knowledge-distribution/:classId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }
    if (classData.teacherId !== req.user!.userId) {
      return res.status(403).json({ error: '无权查看该班级数据' });
    }

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { classId },
      include: {
        assessments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    // 计算分布
    const distribution = knowledgePoints.map(kp => {
      const levels = [0, 0, 0, 0, 0]; // 1-5级人数
      for (const a of kp.assessments) {
        if (a.masteryLevel >= 1 && a.masteryLevel <= 5) {
          levels[a.masteryLevel - 1]++;
        }
      }
      const avgLevel = kp.assessments.length > 0
        ? kp.assessments.reduce((sum, a) => sum + a.masteryLevel, 0) / kp.assessments.length
        : 0;

      return {
        id: kp.id,
        title: kp.title,
        description: kp.description,
        totalAssessments: kp.assessments.length,
        averageLevel: Math.round(avgLevel * 10) / 10,
        levelDistribution: {
          level1: levels[0],
          level2: levels[1],
          level3: levels[2],
          level4: levels[3],
          level5: levels[4],
        },
        // 个体数据
        assessments: kp.assessments.map(a => ({
          student: a.student,
          masteryLevel: a.masteryLevel,
          selfNote: a.selfNote,
        })),
      };
    });

    res.json({ distribution });
  } catch (error) {
    console.error('获取知识点分布失败:', error);
    res.status(500).json({ error: '获取知识点分布失败' });
  }
});

export default router;
