import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherStore } from '@/stores/teacherStore';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  BarChart3,
  AlertTriangle,
  Clock,
  Sparkles,
  Library,
  Loader2,
} from 'lucide-react';

export function TeacherDashboard() {
  const { classStats, recentActivities, upcomingTasks, aiSuggestion, isLoadingDashboard, fetchClassStats, fetchRecentActivities, fetchUpcomingTasks, fetchAISuggestion } = useTeacherStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassStats();
    fetchRecentActivities();
    fetchUpcomingTasks();
    fetchAISuggestion();
  }, []);

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">欢迎回来，{user?.name ?? '老师'}</h1>
            <p className="text-blue-100">
              今天是{new Date().toLocaleDateString('zh-CN')}，{upcomingTasks.length > 0 ? `您有 ${upcomingTasks.length} 项待办任务需要处理。` : '暂无待办任务。'}
            </p>
          </div>
          <Button
            className="bg-white text-blue-600 hover:bg-gray-100 gap-2"
            onClick={() => navigate('/ai-assistant?prompt=' + encodeURIComponent('我是教师，请根据当前班级作业提交率和错题分布，给出教学改进建议。'))}
          >
            <Sparkles className="w-4 h-4" />
            AI 教学助手
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">授课学生</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingDashboard ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : classStats?.totalStudents ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">进行中的课程</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingDashboard ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : classStats?.totalClasses ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">本周作业提交率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingDashboard ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (classStats?.submissionRate != null ? `${classStats.submissionRate}%` : '—')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待关注学生</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingDashboard ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : classStats?.pendingAlerts ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 快捷入口 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">快捷入口</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: '学生行为数据', icon: BarChart3, color: 'bg-blue-100 text-blue-600', path: '/teacher/behavior' },
                  { name: '精准干预', icon: AlertTriangle, color: 'bg-orange-100 text-orange-600', path: '/teacher/intervention' },
                  { name: '资源中心', icon: Library, color: 'bg-green-100 text-green-600', path: '/teacher/resources' },
                  { name: '作业管理', icon: BookOpen, color: 'bg-purple-100 text-purple-600', path: '/teacher/homeworks' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近动态 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">最近动态</CardTitle>
              <Button variant="link" className="text-blue-600" onClick={() => navigate('/teacher/analytics')}>
                查看全部
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.type === 'submit' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : activity.type === 'discussion' ? (
                        <Users className="w-5 h-5" />
                      ) : activity.type === 'quiz' ? (
                        <BarChart3 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 待办任务 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">待办任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/teacher/homeworks')}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.count && (
                        <Badge variant="secondary">{task.count}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{task.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI 教学建议 */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">AI 教学建议</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {aiSuggestion ?? '正在分析班级数据，生成教学建议...'}
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/ai-assistant?prompt=' + encodeURIComponent('我是教师，请根据当前班级作业提交率和错题分布，给出教学改进建议。'))}
              >
                查看详细建议
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
