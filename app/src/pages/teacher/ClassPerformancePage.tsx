import { useEffect, useState } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useClassPerformanceStore } from '@/stores/classPerformanceStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Download,
  MessageSquare,
  Share2,
  BookOpen,
  Trash2,
  BarChart3,
} from 'lucide-react';
import type { PerformanceType } from '@/types';

const TYPE_MAP: Record<PerformanceType, { label: string; color: string; icon: typeof MessageSquare }> = {
  CLASSROOM_QA: { label: '课堂问答', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  KNOWLEDGE_SHARE: { label: '知识分享', color: 'bg-orange-100 text-orange-700', icon: Share2 },
};

const MASTERY_LABELS = ['完全不了解', '初步了解', '基本掌握', '熟练运用', '融会贯通'];

export function ClassPerformancePage() {
  const { classes, fetchTeacherClasses } = useClassStore();
  const {
    records,
    summary,
    knowledgePoints,
    knowledgeDistribution,
    isLoading,
    createRecord,
    fetchRecords,
    deleteRecord,
    fetchSummary,
    exportRecords,
    publishKnowledgePoints,
    fetchKnowledgePoints,
    fetchKnowledgeDistribution,
  } = useClassPerformanceStore();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab] = useState<'records' | 'summary' | 'knowledge'>('records');

  // 新建记录表单
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [recordType, setRecordType] = useState<PerformanceType>('CLASSROOM_QA');
  const [recordStudentId, setRecordStudentId] = useState('');
  const [recordTopic, setRecordTopic] = useState('');
  const [recordScore, setRecordScore] = useState('3');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordDuration, setRecordDuration] = useState('');

  // 知识点发布表单
  const [isKpOpen, setIsKpOpen] = useState(false);
  const [kpItems, setKpItems] = useState([{ title: '', description: '' }]);

  // 班级学生列表
  const [classStudents, setClassStudents] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchRecords(selectedClassId);
      fetchSummary(selectedClassId);
      fetchKnowledgePoints(selectedClassId);
      fetchKnowledgeDistribution(selectedClassId);
      // 获取班级学生
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls && cls.students) {
        setClassStudents(cls.students.map((s) => ({ id: s.id, name: s.name, email: s.email })));
      }
    }
  }, [selectedClassId]);

  const handleCreateRecord = async () => {
    if (!selectedClassId || !recordStudentId) {
      toast.error('请选择班级和学生');
      return;
    }

    try {
      await createRecord({
        classId: selectedClassId,
        studentId: recordStudentId,
        type: recordType,
        topic: recordTopic || undefined,
        score: parseInt(recordScore) || undefined,
        notes: recordNotes || undefined,
        duration: recordDuration ? parseInt(recordDuration) : undefined,
      });
      setIsCreateOpen(false);
      setRecordTopic('');
      setRecordScore('3');
      setRecordNotes('');
      setRecordDuration('');
    } catch {
      // handled by global interceptor
    }
  };

  const handlePublishKnowledgePoints = async () => {
    if (!selectedClassId) return;
    const validPoints = kpItems.filter(p => p.title.trim());
    if (validPoints.length === 0) {
      toast.error('请至少添加一个知识点');
      return;
    }

    try {
      await publishKnowledgePoints(selectedClassId, validPoints);
      setIsKpOpen(false);
      setKpItems([{ title: '', description: '' }]);
      fetchKnowledgePoints(selectedClassId);
    } catch {
      // handled by global interceptor
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">平时表现管理</h1>
          <p className="text-gray-500 mt-1">记录课堂问答、知识分享、知识点自评等平时表现</p>
        </div>
      </div>

      {/* 班级选择 */}
      <div className="flex items-center gap-4">
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg min-w-[200px]"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="">请选择班级</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {selectedClassId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              新建记录
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsKpOpen(true)}>
              <BookOpen className="w-4 h-4 mr-1" />
              发布知识点
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportRecords(selectedClassId, 'csv')}>
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
          </div>
        )}
      </div>

      {/* Tab 切换 */}
      {selectedClassId && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {[
            { key: 'records' as const, label: '记录列表' },
            { key: 'summary' as const, label: '统计汇总' },
            { key: 'knowledge' as const, label: '知识点自评' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区 */}
      {!selectedClassId ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">请先选择一个班级</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      ) : activeTab === 'records' ? (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">暂无记录</p>
            </div>
          ) : (
            records.map((record) => {
              const typeInfo = TYPE_MAP[record.type as PerformanceType];
              return (
                <Card key={record.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={typeInfo?.color}>{typeInfo?.label || record.type}</Badge>
                        <span className="font-medium">{record.student.name}</span>
                        {record.topic && <span className="text-sm text-gray-500">{record.topic}</span>}
                        {record.score && (
                          <Badge variant="outline">
                            {'★'.repeat(record.score)}{'☆'.repeat(5 - record.score)}
                          </Badge>
                        )}
                        {record.duration && (
                          <span className="text-xs text-gray-400">{record.duration}分钟</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(record.occurredAt).toLocaleString('zh-CN')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteRecord(record.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-sm text-gray-600 mt-2 pl-2 border-l-2 border-gray-200">{record.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : activeTab === 'summary' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>学生表现汇总</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">姓名</th>
                      <th className="text-center py-2 px-3">问答次数</th>
                      <th className="text-center py-2 px-3">问答均分</th>
                      <th className="text-center py-2 px-3">分享次数</th>
                      <th className="text-center py-2 px-3">分享均分</th>
                      <th className="text-center py-2 px-3">综合得分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => (
                      <tr key={s.student.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{s.student.name}</td>
                        <td className="text-center py-2 px-3">{s.qaCount}</td>
                        <td className="text-center py-2 px-3">{s.qaAvgScore}</td>
                        <td className="text-center py-2 px-3">{s.shareCount}</td>
                        <td className="text-center py-2 px-3">{s.shareAvgScore}</td>
                        <td className="text-center py-2 px-3 font-medium text-blue-600">{s.compositeScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {knowledgePoints.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无知识点清单，点击"发布知识点"创建</p>
            </div>
          ) : (
            knowledgeDistribution.map((kp) => (
              <Card key={kp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{kp.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">均值: {kp.averageLevel}</span>
                      <span className="text-sm text-gray-500">({kp.totalAssessments}人已评)</span>
                    </div>
                  </div>
                  {kp.description && <p className="text-sm text-gray-500">{kp.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-end h-16">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const count = kp.levelDistribution[`level${level}` as keyof typeof kp.levelDistribution];
                      const maxCount = Math.max(
                        kp.levelDistribution.level1,
                        kp.levelDistribution.level2,
                        kp.levelDistribution.level3,
                        kp.levelDistribution.level4,
                        kp.levelDistribution.level5,
                        1,
                      );
                      return (
                        <div key={level} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-blue-200 rounded-t"
                            style={{ height: `${(count / maxCount) * 48}px`, minHeight: count > 0 ? '4px' : '0' }}
                          />
                          <span className="text-[10px] text-gray-500">{MASTERY_LABELS[level - 1]}</span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 新建记录对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建平时表现记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">记录类型</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as PerformanceType)}
              >
                <option value="CLASSROOM_QA">课堂问答</option>
                <option value="KNOWLEDGE_SHARE">知识分享</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">学生</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={recordStudentId}
                onChange={(e) => setRecordStudentId(e.target.value)}
              >
                <option value="">请选择学生</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">主题/知识点</label>
              <Input
                placeholder="例如：决策树算法"
                value={recordTopic}
                onChange={(e) => setRecordTopic(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">表现等级 (1-5)</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={recordScore}
                  onChange={(e) => setRecordScore(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map(i => (
                    <option key={i} value={i}>{i} - {'★'.repeat(i)}</option>
                  ))}
                </select>
              </div>
              {recordType === 'KNOWLEDGE_SHARE' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">分享时长(分钟)</label>
                  <Input
                    type="number"
                    value={recordDuration}
                    onChange={(e) => setRecordDuration(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Textarea
                placeholder="表现说明..."
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={handleCreateRecord}>
              保存记录
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 发布知识点对话框 */}
      <Dialog open={isKpOpen} onOpenChange={setIsKpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发布知识点清单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
            {kpItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={`知识点 ${index + 1} 标题`}
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...kpItems];
                      updated[index] = { ...updated[index], title: e.target.value };
                      setKpItems(updated);
                    }}
                  />
                  <Input
                    placeholder="说明（可选）"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...kpItems];
                      updated[index] = { ...updated[index], description: e.target.value };
                      setKpItems(updated);
                    }}
                  />
                </div>
                {kpItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 mt-1"
                    onClick={() => setKpItems(kpItems.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKpItems([...kpItems, { title: '', description: '' }])}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加知识点
            </Button>
            <Button className="w-full" onClick={handlePublishKnowledgePoints}>
              发布
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
