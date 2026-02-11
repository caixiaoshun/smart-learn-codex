import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCaseStore } from '@/stores/caseStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Share2,
  Download,
  Eye,
  Star,
  Clock,
  BarChart3,
  TrendingUp,
  FileText,
  Code2,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Tag,
  FolderOpen,
  FileDown,
  Loader2,
  Flag,
  FlaskConical,
  Brain,
  ChevronRight,
  Copy,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import type { Case } from '@/types';

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-50 text-green-600 border-green-100',
  MEDIUM: 'bg-amber-50 text-amber-600 border-amber-100',
  HARD: 'bg-red-50 text-red-600 border-red-100',
};

const CATEGORY_COLORS: Record<string, string> = {
  '关联规则': 'bg-blue-50 text-blue-600 border-blue-100',
  '决策树': 'bg-green-50 text-green-600 border-green-100',
  '聚类': 'bg-purple-50 text-purple-600 border-purple-100',
  '协同过滤': 'bg-amber-50 text-amber-600 border-amber-100',
  '回归分析': 'bg-cyan-50 text-cyan-600 border-cyan-100',
  '文本挖掘': 'bg-rose-50 text-rose-600 border-rose-100',
};

const INSIGHT_ICONS = [
  { icon: Flag, bg: 'bg-amber-100', text: 'text-amber-600' },
  { icon: FlaskConical, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { icon: Brain, bg: 'bg-purple-100', text: 'text-purple-600' },
];

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { fetchCaseDetail, fetchCases, cases, bookmarkCase, unbookmarkCase, checkBookmark, rateCase, fetchComments, addComment, deleteComment } = useCaseStore();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Comment state
  const [comments, setComments] = useState<{ id: string; userId: string; username: string; avatar?: string; role?: string; content: string; createdAt: string }[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadCase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchCaseDetail(id);
      setCaseData(detail);
    } catch {
      setError('获取案例详情失败');
      toast.error('获取案例详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, fetchCaseDetail]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (cases.length === 0) {
      fetchCases({ limit: 10 });
    }
  }, [cases.length, fetchCases]);

  useEffect(() => {
    if (id && isAuthenticated) {
      checkBookmark(id).then(setIsBookmarked);
    }
  }, [id, isAuthenticated, checkBookmark]);

  // Load comments
  useEffect(() => {
    if (id) {
      fetchComments(id).then(setComments).catch(() => {});
    }
  }, [id, fetchComments]);

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim()) return;
    if (!isAuthenticated) {
      toast.error('请先登录后再评论');
      return;
    }
    setSubmittingComment(true);
    try {
      const newComment = await addComment(id, commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      toast.success('评论发表成功');
    } catch {
      toast.error('评论发表失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await deleteComment(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('评论已删除');
    } catch {
      toast.error('删除评论失败');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleBookmark = async () => {
    if (!id) return;
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await unbookmarkCase(id);
        setIsBookmarked(false);
        toast.success('已取消收藏');
      } else {
        await bookmarkCase(id);
        setIsBookmarked(true);
        toast.success('已收藏案例');
      }
    } catch {
      toast.error(isBookmarked ? '取消收藏失败' : '收藏失败');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success('链接已复制到剪贴板'),
      () => toast.error('复制链接失败')
    );
  };

  const handleRate = async (rating: number) => {
    if (!id) return;
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }
    try {
      await rateCase(id, rating);
      setUserRating(rating);
      toast.success(`已评分 ${rating} 星`);
    } catch {
      toast.error('评分失败');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('代码已复制'),
      () => toast.error('复制失败')
    );
  };

  const relatedCases = cases.filter(c => c.id !== id).slice(0, 3);

  // Parse content sections from the case content
  const parseContentSections = (content: string) => {
    const sections: { title: string; body: string }[] = [];
    if (!content) return sections;

    const parts = content.split(/(?=^##\s)/m);
    for (const part of parts) {
      const match = part.match(/^##\s+(.+)\n([\s\S]*)/);
      if (match) {
        sections.push({ title: match[1].trim(), body: match[2].trim() });
      } else if (part.trim()) {
        sections.push({ title: '案例背景与描述', body: part.trim() });
      }
    }
    if (sections.length === 0 && content.trim()) {
      sections.push({ title: '案例背景与描述', body: content.trim() });
    }
    return sections;
  };

  // Parse teaching insights from content (lines starting with "- **" pattern)
  const parseInsights = (content: string) => {
    const insights: { title: string; desc: string }[] = [];
    const regex = /[-*]\s*\*\*(.+?)\*\*[：:]\s*([\s\S]*?)(?=\n[-*]\s*\*\*|\n##|$)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      insights.push({ title: match[1], desc: match[2].trim() });
    }
    return insights;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">加载案例详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{error || '案例不存在'}</h2>
          <p className="text-slate-500 text-sm">请检查链接是否正确或返回案例库</p>
          <Button onClick={() => navigate('/cases')} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> 返回案例库
          </Button>
        </div>
      </div>
    );
  }

  const contentSections = parseContentSections(caseData.content);
  const insights = parseInsights(caseData.content);
  const categoryColor = CATEGORY_COLORS[caseData.category] || 'bg-blue-50 text-blue-600 border-blue-100';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-blue-100/30">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-blue-600 transition-colors">
            首页
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button onClick={() => navigate('/cases')} className="text-slate-500 hover:text-blue-600 transition-colors">
            案例库
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-blue-600 font-semibold truncate max-w-[200px]">{caseData.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <main className="flex-1 flex flex-col gap-8 min-w-0">
            {/* Case Header Card */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${categoryColor}`}>
                      {caseData.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 案例详情
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">{caseData.title}</h1>
                  <p className="text-slate-600 text-lg leading-relaxed">{caseData.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBookmark}
                    disabled={bookmarkLoading}
                    className={`border-blue-100 hover:bg-blue-50 ${isBookmarked ? 'text-blue-600' : 'text-slate-400'}`}
                    title={isBookmarked ? '取消收藏' : '收藏'}
                  >
                    {bookmarkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    className="border-blue-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    title="分享"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      if (caseData.resources && Array.isArray(caseData.resources) && caseData.resources.length > 0) {
                        const first = caseData.resources[0];
                        if (first.url) {
                          window.open(first.url, '_blank', 'noopener,noreferrer');
                        }
                      } else {
                        handleShare();
                        toast.info('暂无可下载的教案文件，已复制链接');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Download className="w-4 h-4" /> 下载教案
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-blue-100/50">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">浏览量</span>
                  <span className="text-lg font-bold text-slate-800 flex items-center gap-1">
                    {caseData.views.toLocaleString()} <TrendingUp className="w-4 h-4 text-green-500" />
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">评分</span>
                  <span className="text-lg font-bold text-slate-800 flex items-center gap-1">
                    {caseData.rating.toFixed(1)} <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">难度等级</span>
                  <span className="text-lg font-bold text-slate-800">
                    {DIFFICULTY_LABELS[caseData.difficulty] || caseData.difficulty}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">预计课时</span>
                  <span className="text-lg font-bold text-slate-800">{caseData.duration} 课时</span>
                </div>
              </div>
            </div>

            {/* Content Sections + Code + Insights in 2-col layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 flex flex-col gap-8">
                {/* Case Background & Description */}
                <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                    <FileText className="w-5 h-5 text-blue-600" /> 案例背景与描述
                  </h2>
                  <div className="prose prose-slate max-w-none text-slate-700 space-y-4 leading-relaxed">
                    {contentSections.length > 0 ? (
                      contentSections.map((section, i) => (
                        <div key={i}>
                          {contentSections.length > 1 && i > 0 && (
                            <h3 className="font-bold text-slate-800 text-lg mt-6">{section.title}</h3>
                          )}
                          {section.body.split('\n\n').map((para, j) => (
                            <p key={j}>{para}</p>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">暂无内容</p>
                    )}
                  </div>
                </section>

                {/* Code Example */}
                {caseData.codeExample && (
                  <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                      <Code2 className="w-5 h-5 text-blue-600" /> 核心代码实现
                    </h2>
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 font-mono text-sm">
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-500">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                        <span className="ml-2">code_example</span>
                        <button
                          onClick={() => handleCopyCode(caseData.codeExample!)}
                          className="ml-auto flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> 复制
                        </button>
                      </div>
                      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre text-sm text-slate-800">{caseData.codeExample}</pre>
                      </div>
                    </div>
                  </section>
                )}

                {/* Teaching Insights */}
                {insights.length > 0 && (
                  <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                      <Lightbulb className="w-5 h-5 text-blue-600" /> 教学启示与思政育人点
                    </h2>
                    <div className="space-y-6">
                      {insights.map((insight, i) => {
                        const style = INSIGHT_ICONS[i % INSIGHT_ICONS.length];
                        const IconComp = style.icon;
                        return (
                          <div key={i} className="flex gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.bg} flex items-center justify-center ${style.text}`}>
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{insight.title}</h3>
                              <p className="text-slate-600 mt-1">{insight.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Discussion Section */}
                <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" /> 教学研讨
                      <span className="text-sm font-normal text-slate-500">({comments.length})</span>
                    </h2>
                  </div>

                  {/* Comment form */}
                  {isAuthenticated ? (
                    <div className="flex gap-4 mb-8">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="分享您对该案例的教学心得或建议..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="w-full rounded-xl border-blue-100 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 h-24 resize-none"
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            onClick={handleSubmitComment}
                            disabled={submittingComment || !commentText.trim()}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            发表评论
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-sm">
                        请先<button onClick={() => navigate('/login')} className="text-blue-600 hover:underline mx-1">登录</button>后再发表评论
                      </p>
                    </div>
                  )}

                  {/* Comment list */}
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">暂无评论，来发表第一条评论吧</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                            {comment.avatar ? (
                              <img src={comment.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-slate-900">{comment.username}</span>
                              {comment.role === 'TEACHER' && (
                                <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">老师</Badge>
                              )}
                              <span className="text-xs text-slate-400">{formatTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{comment.content}</p>
                          </div>
                          {user && (user.id === comment.userId || user.role === 'TEACHER') && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="删除评论"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <aside className="flex flex-col gap-6">
                {/* AI Teaching Suggestions */}
                <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white shadow-xl shadow-indigo-200/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <h3 className="font-bold text-lg">AI 教学建议</h3>
                  </div>
                  <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
                    根据此案例的主题和难度，建议在教学中结合实际数据集进行实践演练，帮助学生更好地理解核心概念。
                  </p>
                  <div className="w-full bg-white/10 rounded-lg p-3 backdrop-blur-sm mb-4">
                    <p className="text-xs font-medium text-white/80 mb-1">推荐教学方法：</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-white/20 rounded text-[10px]">案例教学法</span>
                      <span className="px-2 py-1 bg-white/20 rounded text-[10px]">小组讨论</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/ai-assistant')}
                    className="w-full bg-white text-blue-600 font-bold hover:bg-indigo-50 transition-colors text-sm"
                  >
                    咨询 AI 助手
                  </Button>
                </div>

                {/* Tags & Categories */}
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">标签与分类</h3>
                  <div className="flex flex-col gap-4">
                    {caseData.tags.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-500 mb-2 block">知识点标签</span>
                        <div className="flex flex-wrap gap-2">
                          {caseData.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {caseData.theme.length > 0 && (
                      <>
                        <hr className="border-slate-100" />
                        <div>
                          <span className="text-xs text-slate-500 mb-2 block">思政主题标签</span>
                          <div className="flex flex-wrap gap-2">
                            {caseData.theme.map((t, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full text-xs hover:bg-sky-100 transition-colors cursor-pointer"
                              >
                                # {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">为案例评分</h3>
                  <div className="flex items-center gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= (hoverRating || userRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && (
                    <p className="text-center text-xs text-slate-500 mt-2">您的评分：{userRating} 星</p>
                  )}
                </div>

                {/* Related Cases */}
                {relatedCases.length > 0 && (
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">相关案例推荐</h3>
                    <div className="flex flex-col gap-4">
                      {relatedCases.map((rc) => (
                        <button
                          key={rc.id}
                          onClick={() => navigate(`/cases/${rc.id}`)}
                          className="group flex gap-3 items-start text-left w-full"
                        >
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center group-hover:border-blue-300 transition-colors">
                            <BarChart3 className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {rc.title}
                            </h4>
                            <span className="text-xs text-slate-400 mt-1 block">
                              {rc.category} · {DIFFICULTY_LABELS[rc.difficulty] || rc.difficulty}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resource Downloads */}
                {caseData.resources && (
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">资源下载</h3>
                    <div className="space-y-3">
                      {Array.isArray(caseData.resources) ? (
                        caseData.resources.map((res: { url?: string; title?: string; type?: string; size?: string }, i: number) => (
                          <a
                            key={i}
                            href={res.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-100"
                          >
                            <div className="flex items-center gap-3">
                              <FileDown className="w-5 h-5 text-blue-500" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                                  {res.title || `资源 ${i + 1}`}
                                </span>
                                {res.size && (
                                  <span className="text-[10px] text-slate-400">{res.size}</span>
                                )}
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </a>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500 text-center py-2">查看案例附件资源</div>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
