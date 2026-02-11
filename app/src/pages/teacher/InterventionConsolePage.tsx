import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherStore } from '@/stores/teacherStore';
import { useClassStore } from '@/stores/classStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Send,
  Eye,
  BarChart3,
  Trophy,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function InterventionConsolePage() {
  const { interventions, interventionStats, aiInsights, isGeneratingHomework, fetchInterventions, generateAIHomework } = useTeacherStore();
  const { classes, fetchTeacherClasses } = useClassStore();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | 'warning' | 'high'>('all');
  const [homeworkTopic, setHomeworkTopic] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enableBasic, setEnableBasic] = useState(true);
  const [enableAdvanced, setEnableAdvanced] = useState(true);
  const [enableChallenge, setEnableChallenge] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');

  useEffect(() => {
    fetchInterventions();
    fetchTeacherClasses();
  }, []);

  // 当班级列表加载完成后，默认选中第一个班级
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  const filteredInterventions = interventions.filter((s) => {
    if (filter === 'warning') return s.behaviorScore < 50;
    if (filter === 'high') return s.behaviorScore >= 80;
    return true;
  });

  const warningCount = interventionStats?.warningCount ?? 0;
  const highPerformers = interventionStats?.highPerformers ?? 0;
  const pendingInterventions = interventionStats?.pendingInterventions ?? 0;
  const urgentCount = interventionStats?.urgentCount ?? 0;
  const avgPoints = interventionStats?.avgPoints ?? 0;

  const handlePublish = async () => {
    if (!homeworkTopic.trim()) return;
    if (!selectedClassId) {
      setPublishMessage('请先选择班级');
      return;
    }
    try {
      await generateAIHomework(homeworkTopic.trim(), selectedClassId);
      setPublishMessage('分层作业已生成并发布！');
      setHomeworkTopic('');
    } catch {
      setPublishMessage('发布失败，请重试');
    }
  };

  const getBehaviorColor = (score: number) => {
    if (score < 50) return 'text-red-600';
    if (score < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBehaviorBarColor = (score: number) => {
    if (score < 50) return 'bg-red-500';
    if (score < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBehaviorLabel = (score: number) => {
    if (score < 50) return '低';
    if (score < 80) return '中';
    return '高';
  };

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>首页</span>
        <ChevronRight className="w-4 h-4" />
        <span>班级管理</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-blue-600">干预与分层作业</span>
      </div>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">干预控制台</h1>
          <p className="text-gray-600 mt-1">
            根据学生行为数据和积分体系，管理分层作业、推荐个性化资源并跟踪干预效果。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => toast.info('暂无历史记录')}>
            <Clock className="w-4 h-4" />
            历史记录
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => document.getElementById('homework-topic-input')?.focus()}>
            <Sparkles className="w-4 h-4" />
            新建分层作业
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">本周预警学生</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{warningCount}</span>
                  {warningCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      需关注
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">行为分低于 50 的学生</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">待处理干预</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{pendingInterventions}</span>
                  {urgentCount > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                      {urgentCount} 个紧急
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">行为分低于 80 的学生</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">班级平均积分</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{avgPoints}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">基于已评分作业计算</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI 智能助教分析 */}
      {aiInsights && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">AI 智能助教分析</h3>
                    <Badge className="bg-blue-100 text-blue-700">AI 洞察</Badge>
                  </div>
                  <p className="text-gray-600 leading-relaxed max-w-3xl">
                    {aiInsights}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success('已采纳 AI 建议')}>
                采纳建议
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 学生干预列表 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">学生干预列表</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg ${filter === 'all' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  全部 ({interventions.length})
                </button>
                <button
                  onClick={() => setFilter('warning')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg ${filter === 'warning' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  预警 ({warningCount})
                </button>
                <button
                  onClick={() => setFilter('high')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg ${filter === 'high' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  高分 ({highPerformers})
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 表头 */}
              <div className="grid grid-cols-12 gap-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
                <div className="col-span-3">学生信息</div>
                <div className="col-span-2">行为评分 (本周)</div>
                <div className="col-span-2">当前积分</div>
                <div className="col-span-3">AI 推荐方案</div>
                <div className="col-span-2">操作</div>
              </div>

              {/* 学生列表 */}
              <div className="space-y-2 mt-2">
                {filteredInterventions.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">暂无学生数据</div>
                ) : (
                  filteredInterventions.map((student) => (
                    <div
                      key={student.id}
                      className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback>{student.studentName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          <p className="text-sm text-gray-500">ID: {student.studentId.slice(0, 8)}</p>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getBehaviorColor(student.behaviorScore)}`}>
                            {getBehaviorLabel(student.behaviorScore)}
                          </span>
                          <span className={`font-medium ${getBehaviorColor(student.behaviorScore)}`}>
                            {student.behaviorScore}%
                          </span>
                        </div>
                        <div className="w-20 mt-1">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getBehaviorBarColor(student.behaviorScore)}`}
                              style={{ width: `${student.behaviorScore}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className="font-medium text-gray-900">
                          {student.currentPoints.toLocaleString()}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${
                            student.behaviorScore < 50
                              ? 'border-blue-300 text-blue-700 bg-blue-50'
                              : student.behaviorScore < 80
                              ? 'border-gray-300 text-gray-700'
                              : 'border-purple-300 text-purple-700 bg-purple-50'
                          }`}
                        >
                          {student.behaviorScore < 50 ? (
                            <GraduationCap className="w-3 h-3" />
                          ) : student.behaviorScore < 80 ? (
                            <BookOpen className="w-3 h-3" />
                          ) : (
                            <Trophy className="w-3 h-3" />
                          )}
                          {student.aiRecommendation}
                        </Badge>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => toast.success(`已向 ${student.studentName} 推送干预资源`)}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => navigate('/teacher/behavior')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速发布作业 */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">快速发布作业</CardTitle>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  作业主题
                </label>
                <input
                  id="homework-topic-input"
                  type="text"
                  value={homeworkTopic}
                  onChange={(e) => setHomeworkTopic(e.target.value)}
                  placeholder="例如: 3.1 空间向量基础..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  目标班级
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {classes.length === 0 && <option value="">暂无班级</option>}
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  分层设置 (AI 辅助生成)
                </label>
                <div className="space-y-3">
                  {/* 基础层 */}
                  <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">基础层</p>
                          <p className="text-xs text-gray-500">针对 {warningCount} 名预警学生</p>
                        </div>
                      </div>
                      <Switch checked={enableBasic} onCheckedChange={setEnableBasic} />
                    </div>
                  </div>

                  {/* 进阶层 */}
                  <div className="p-4 border border-green-200 rounded-xl bg-green-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">进阶层</p>
                          <p className="text-xs text-gray-500">全班通用</p>
                        </div>
                      </div>
                      <Switch checked={enableAdvanced} onCheckedChange={setEnableAdvanced} />
                    </div>
                  </div>

                  {/* 挑战层 */}
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">挑战层</p>
                          <p className="text-xs text-gray-500">针对 {highPerformers} 名高分学生</p>
                        </div>
                      </div>
                      <Switch checked={enableChallenge} onCheckedChange={setEnableChallenge} />
                    </div>
                  </div>
                </div>
              </div>

              {publishMessage && (
                <p className={`text-sm ${publishMessage.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
                  {publishMessage}
                </p>
              )}

              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handlePublish}
                disabled={isGeneratingHomework || !homeworkTopic.trim()}
              >
                {isGeneratingHomework ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGeneratingHomework ? 'AI 正在生成...' : 'AI 生成并发布'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
