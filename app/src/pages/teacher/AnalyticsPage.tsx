import { useEffect, useState } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  Users, 
  FileCheck, 
  Award,
  AlertTriangle,
  BarChart3,
  ChevronRight,
} from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AnalyticsPage() {
  const { classes, fetchTeacherClasses } = useClassStore();
  const { 
    homeworkStats, 
    scoreDistribution, 
    classOverview,
    isLoading,
    fetchClassHomeworkStats,
    fetchScoreDistribution,
    fetchClassOverview,
  } = useAnalyticsStore();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>('');

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassHomeworkStats(selectedClassId);
      fetchClassOverview(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedHomeworkId) {
      fetchScoreDistribution(selectedHomeworkId);
    }
  }, [selectedHomeworkId]);

  // 自动选择第一个班级
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  // 自动选择第一个作业
  useEffect(() => {
    if (homeworkStats.length > 0 && !selectedHomeworkId) {
      setSelectedHomeworkId(homeworkStats[0].id);
    }
  }, [homeworkStats]);

  const selectedHomework = homeworkStats.find(h => h.id === selectedHomeworkId);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-600 mt-1">
            查看班级作业统计和成绩分析
          </p>
        </div>
        
        {/* 班级选择 */}
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      ) : (
        <>
          {/* 概览统计 */}
          {classOverview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">学生人数</p>
                      <p className="text-2xl font-bold">{classOverview.class.studentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FileCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">总体提交率</p>
                      <p className="text-2xl font-bold">{classOverview.overview.overallSubmissionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">平均分</p>
                      <p className="text-2xl font-bold">{classOverview.overview.averageScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">作业总数</p>
                      <p className="text-2xl font-bold">{classOverview.class.homeworkCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">作业概览</TabsTrigger>
              <TabsTrigger value="distribution">成绩分布</TabsTrigger>
              <TabsTrigger value="students">学生排名</TabsTrigger>
            </TabsList>

            {/* 作业概览 */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">作业提交情况</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={homeworkStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="title" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="statistics.submitted" name="已提交" fill="#22c55e" />
                        <Bar dataKey="statistics.notSubmitted" name="未提交" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 作业列表 */}
              <div className="space-y-3">
                {homeworkStats.map((hw) => (
                  <Card key={hw.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedHomeworkId(hw.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{hw.title}</p>
                          <p className="text-sm text-gray-500">
                            提交率 {hw.statistics.submissionRate}% | 
                            平均分 {hw.statistics.averageScore || '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="text-green-600">{hw.statistics.submitted}</span>
                              <span className="text-gray-400"> / {hw.statistics.totalStudents}</span>
                            </p>
                            <p className="text-xs text-gray-400">已提交/总人数</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 成绩分布 */}
            <TabsContent value="distribution" className="space-y-4">
              {selectedHomework && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{selectedHomework.title} - 成绩分布</h3>
                    <select
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                      value={selectedHomeworkId}
                      onChange={(e) => setSelectedHomeworkId(e.target.value)}
                    >
                      {homeworkStats.map((hw) => (
                        <option key={hw.id} value={hw.id}>{hw.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">分数段分布</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={scoreDistribution || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="label"
                              >
                                {(scoreDistribution || []).map((_item, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {(scoreDistribution || []).map((item, index) => (
                            <div key={index} className="flex items-center gap-1 text-sm">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span>{item.label}: {item.count}人</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">成绩统计</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-green-600">
                              {selectedHomework.statistics.highestScore || '-'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">最高分</p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-red-600">
                              {selectedHomework.statistics.lowestScore || '-'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">最低分</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-blue-600">
                              {selectedHomework.statistics.averageScore || '-'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">平均分</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-purple-600">
                              {selectedHomework.statistics.submissionRate}%
                            </p>
                            <p className="text-sm text-gray-600 mt-1">提交率</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* 学生排名 */}
            <TabsContent value="students" className="space-y-4">
              {classOverview && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        优秀学生榜
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {classOverview.topStudents.map((student, index) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-medium">{student.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">
                                提交 {student.submissionCount} 次
                              </span>
                              <Badge className="bg-green-100 text-green-700">
                                {student.totalScore} 分
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {classOverview.needAttention.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          需关注学生
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {classOverview.needAttention.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                            >
                              <span className="font-medium">{student.name}</span>
                              <Badge className="bg-orange-100 text-orange-700">
                                仅提交 {student.submissionCount} 次
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
