import { useEffect } from 'react';
import { useTeacherStore } from '@/stores/teacherStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart } from '@/components/charts/BarChart';
import { RadarChart } from '@/components/charts/RadarChart';
import {
  Download,
  Users,
  CheckCircle,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronRight,
  MoreVertical,
  Sparkles,
} from 'lucide-react';

export function BehaviorAnalysisPage() {
  const { students, classStats, fetchStudents, fetchClassStats, fetchAIInsights } = useTeacherStore();

  useEffect(() => {
    fetchStudents();
    fetchClassStats();
    fetchAIInsights();
  }, []);

  // Derive chart data from student behavior data
  const activityData = (() => {
    if (!students.length) return [];
    // Generate activity trend from students' quiz averages, grouped for chart display
    return students.slice(0, 10).map((s, i) => ({
      name: `${i + 1}日`,
      value: s.quizAvg ?? 0,
    }));
  })();

  const abilityData = (() => {
    if (!students.length) return [];
    const avgQuiz = Math.round(students.reduce((sum, s) => sum + (s.quizAvg ?? 0), 0) / students.length);
    const avgCoding = Math.round(students.reduce((sum, s) => sum + (s.codingHours ?? 0), 0) / students.length);
    const avgDiscussion = Math.round(Math.min(100, students.reduce((sum, s) => sum + (s.discussionPosts ?? 0), 0) / students.length * 10));
    return [
      { subject: '编程', value: Math.min(100, avgCoding * 5), fullMark: 100 },
      { subject: '协作', value: avgDiscussion, fullMark: 100 },
      { subject: '逻辑', value: avgQuiz, fullMark: 100 },
      { subject: '表达', value: Math.round((avgQuiz + avgDiscussion) / 2), fullMark: 100 },
      { subject: '活跃', value: Math.min(100, avgCoding * 4 + avgDiscussion / 2), fullMark: 100 },
    ];
  })();

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            高风险
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            中风险
          </Badge>
        );
      case 'LOW':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            低风险
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>首页</span>
        <ChevronRight className="w-4 h-4" />
        <span>课程管理</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-blue-600">学生行为数据</span>
      </div>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学生行为数据分析</h1>
          <p className="text-gray-600 mt-1">
            汇总清洗随堂测验、在线讨论、编程实验等数据，生成精准干预建议。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => toast.success('报表导出中...')}>
            <Download className="w-4 h-4" />
            导出报表
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => toast.success('关注清单已生成')}>
            <Sparkles className="w-4 h-4" />
            生成关注清单
          </Button>
        </div>
      </div>

      {/* AI 洞察 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                AI 洞察：编程实验异常预警
              </h3>
              <p className="text-gray-600 leading-relaxed">
                检测到 <span className="font-semibold text-gray-900">第4小组</span> 的3名学生在过去48小时内编程提交频率骤降{' '}
                <span className="text-red-600 font-semibold">-45%</span>。系统分析可能存在语法理解障碍，建议推送
                <span className="text-blue-600 underline cursor-pointer">"Python 基础语法回顾"</span>
                资源包进行干预。
              </p>
            </div>
            <Button variant="outline" className="flex-shrink-0" onClick={() => toast.success('干预措施已应用')}>
              应用干预措施
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  学生总数
                </p>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {classStats?.totalStudents}
                  </span>
                </div>
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  全勤
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  测验平均完成率
                </p>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {classStats?.submissionRate}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +2.4% 环比
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  平均参与度评分
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {classStats?.submissionRate}
                  </span>
                  <span className="text-gray-500">/100</span>
                </div>
                <div className="mt-2 w-32">
                  <Progress value={classStats?.submissionRate} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  待干预预警
                </p>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-red-600">
                    {classStats?.pendingAlerts}
                  </span>
                </div>
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  新增 3 人
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 近30天活动趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">近30天活动趋势</CardTitle>
            </div>
            <Badge variant="secondary">所有活动</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <BarChart data={activityData} />
            </div>
          </CardContent>
        </Card>

        {/* 能力维度分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">能力维度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <RadarChart data={abilityData} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 学生数据表格 */}
      <Card>
        <CardContent className="p-6">
          {/* 筛选栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索学生姓名/学号..."
                  className="pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <select className="px-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>2023级 A班</option>
                <option>2023级 B班</option>
              </select>
              <select className="px-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部风险等级</option>
                <option>高风险</option>
                <option>中风险</option>
                <option>低风险</option>
              </select>
            </div>
            <p className="text-sm text-gray-500">
              共 45 条数据，更新于 10分钟前
            </p>
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">学生信息</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">测验均分</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">编程时长 (小时)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">讨论区活跃度</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">最近活动</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">风险评估</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {student.studentName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          <p className="text-sm text-gray-500">学号: {student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{student.quizAvg}%</span>
                        <div className="w-16">
                          <Progress 
                            value={student.quizAvg} 
                            className={`h-1.5 ${
                              student.quizAvg < 70 ? 'bg-red-100 [&>div]:bg-red-500' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{student.codingHours}</td>
                    <td className="py-4 px-4 text-gray-700">{student.discussionPosts} 贴</td>
                    <td className="py-4 px-4 text-gray-500">{student.lastActive}</td>
                    <td className="py-4 px-4">{getRiskBadge(student.riskLevel)}</td>
                    <td className="py-4 px-4">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
