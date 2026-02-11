import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResourceStore } from '@/stores/resourceStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Play,
  Code,
  BookOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Eye,
  Bookmark,
  BookmarkCheck,
  GraduationCap,
  Loader2,
  Copy,
  Send,
  Trash2,
  MessageCircle,
  User,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import type { Resource, Comment } from '@/types';

// PDF 预览组件
function PDFPreview({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full border-0"
      style={{ height: '70vh' }}
      title="PDF Preview"
    />
  );
}

// Jupyter Notebook 预览组件
function NotebookPreview({ content }: { content: any }) {
  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());

  const toggleCell = (index: number) => {
    setCollapsedCells(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('代码已复制'),
      () => toast.error('复制失败')
    );
  };

  return (
    <div className="bg-white">
      <div className="max-w-none mx-auto">
        {content.cells?.map((cell: any, index: number) => {
          const isCollapsed = collapsedCells.has(index);
          const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');

          return (
            <div key={index} className="border-b border-gray-100 group">
              <div className="flex items-center gap-2 px-4 py-1 bg-gray-50/80 text-xs text-gray-500 sticky top-0 z-[1]">
                <button
                  onClick={() => toggleCell(index)}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  cell.cell_type === 'code'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {cell.cell_type === 'code'
                    ? `Code${cell.execution_count != null ? ` [${cell.execution_count}]` : ''}`
                    : 'Markdown'}
                </span>
                {cell.cell_type === 'code' && source && (
                  <button
                    onClick={() => copyCode(source)}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-700"
                    title="复制代码"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>

              {!isCollapsed && (
                <div className="px-4 py-2">
                  {cell.cell_type === 'markdown' && (
                    <div className="prose prose-sm max-w-none py-2">
                      <MarkdownRenderer content={source} />
                    </div>
                  )}
                  {cell.cell_type === 'code' && (
                    <div>
                      <div className="bg-[#1e1e1e] text-gray-100 p-3 rounded-lg font-mono text-sm leading-relaxed overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-words">{source}</pre>
                      </div>
                      {cell.outputs?.length > 0 && (
                        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm overflow-x-auto">
                          {cell.outputs.map((output: any, i: number) => (
                            <div key={i}>
                              {output.text && (
                                <pre className="text-gray-800 whitespace-pre-wrap font-mono text-xs">{Array.isArray(output.text) ? output.text.join('') : output.text}</pre>
                              )}
                              {output.output_type === 'stream' && output.text && (
                                <pre className="text-gray-800 whitespace-pre-wrap font-mono text-xs">{Array.isArray(output.text) ? output.text.join('') : output.text}</pre>
                              )}
                              {output.data?.['image/png'] && (
                                <img
                                  src={`data:image/png;base64,${output.data['image/png']}`}
                                  alt={`Output ${i}`}
                                  className="max-w-full rounded my-2"
                                />
                              )}
                              {output.data?.['text/html'] && (
                                <div
                                  className="overflow-auto"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(Array.isArray(output.data['text/html']) ? output.data['text/html'].join('') : output.data['text/html']) }}
                                />
                              )}
                              {output.data?.['text/plain'] && !output.data?.['image/png'] && !output.data?.['text/html'] && (
                                <pre className="text-gray-800 whitespace-pre-wrap font-mono text-xs">{Array.isArray(output.data['text/plain']) ? output.data['text/plain'].join('') : output.data['text/plain']}</pre>
                              )}
                              {output.output_type === 'error' && (
                                <pre className="text-red-600 whitespace-pre-wrap font-mono text-xs">{Array.isArray(output.traceback) ? output.traceback.join('\n') : (output.traceback || '')}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuthStore();
  const {
    fetchResourceDetail,
    previewResourceFile,
    recordView,
    bookmarkResource,
    unbookmarkResource,
    checkBookmark,
    fetchComments,
    addComment,
    deleteComment,
  } = useResourceStore();

  const [resource, setResource] = useState<Resource | null>(null);
  const [preview, setPreview] = useState<{ type: string; url?: string; content?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // 评论状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadResource = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchResourceDetail(id);
      setResource(res);
      if (res.filePath) {
        const prev = await previewResourceFile(id);
        setPreview(prev);
      }
    } catch {
      toast.error('获取资源详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, fetchResourceDetail, previewResourceFile]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await fetchComments(id);
      setComments(data);
    } catch {
      // silently ignore
    } finally {
      setCommentsLoading(false);
    }
  }, [id, fetchComments]);

  useEffect(() => {
    if (id) {
      recordView(id);
      loadResource();
      loadComments();
    }
  }, [id, recordView, loadResource, loadComments]);

  useEffect(() => {
    if (id && isAuthenticated) {
      checkBookmark(id).then(setIsBookmarked);
    }
  }, [id, isAuthenticated, checkBookmark]);

  const handleBookmark = async () => {
    if (!id || !isAuthenticated || !token) {
      toast.error('请先登录');
      return;
    }
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await unbookmarkResource(id);
        setIsBookmarked(false);
      } else {
        await bookmarkResource(id);
        setIsBookmarked(true);
      }
    } catch {
      // error handled by interceptor
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim()) return;
    if (!isAuthenticated || !token) {
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
      // error handled by interceptor
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
      // error handled by interceptor
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Play className="w-4 h-4" />;
      case 'DEMONSTRATION': return <Code className="w-4 h-4" />;
      case 'NOTEBOOK': return <FileText className="w-4 h-4" />;
      case 'CASE': return <BookOpen className="w-4 h-4" />;
      case 'HOMEWORK': return <GraduationCap className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'bg-blue-100 text-blue-700';
      case 'DEMONSTRATION': return 'bg-purple-100 text-purple-700';
      case 'NOTEBOOK': return 'bg-orange-100 text-orange-700';
      case 'CASE': return 'bg-green-100 text-green-700';
      case 'HOMEWORK': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'VIDEO': return '微课';
      case 'DEMONSTRATION': return '演示';
      case 'NOTEBOOK': return '实验';
      case 'CASE': return '案例';
      case 'HOMEWORK': return '作业';
      default: return '资源';
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

  const goBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-4">加载资源详情...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-gray-500">资源不存在或已被删除</p>
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 顶部导航 */}
      <div className="flex flex-wrap items-center gap-2 text-sm bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-blue-100/30">
        <button onClick={goBack} className="text-slate-500 hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">资源库</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-600 font-semibold truncate">{resource.title}</span>
      </div>

      {/* 资源信息头部 */}
      <Card className="rounded-2xl border-blue-100 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 border ${getTypeColor(resource.type)}`}>
                  {getTypeIcon(resource.type)}
                  {getTypeLabel(resource.type)}
                </span>
                {resource.category && (
                  <Badge variant="outline" className="border-blue-100">{resource.category}</Badge>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {resource.views ?? 0} 次浏览
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">
                {resource.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                {resource.author && <span>作者: {resource.author}</span>}
                <span className="text-orange-600 font-medium">+{resource.points} 积分</span>
                {resource.createdAt && (
                  <span>{formatTime(resource.createdAt)}</span>
                )}
              </div>

              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-600 border border-slate-200">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="gap-2 flex-shrink-0 border-blue-100 hover:bg-blue-50"
            >
              {bookmarkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              {isBookmarked ? '已收藏' : '收藏'}
            </Button>
          </div>

          {/* 描述 */}
          <div className="mt-4 text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100">
            {resource.description}
          </div>
        </CardContent>
      </Card>

      {/* 文件预览 */}
      {preview ? (
        <Card className="rounded-2xl border-blue-100 shadow-sm">
          <CardContent className="p-0 overflow-hidden">
            {preview.type === 'pdf' ? (
              <PDFPreview url={preview.url!} />
            ) : preview.type === 'ipynb' ? (
              <NotebookPreview content={preview.content} />
            ) : null}
          </CardContent>
        </Card>
      ) : resource.filePath ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-400">文件预览加载失败</p>
          </CardContent>
        </Card>
      ) : resource.url ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(resource.url, '_blank')}
            >
              <Play className="w-4 h-4" />
              打开资源链接
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 评论区 */}
      <Card className="rounded-2xl border-blue-100 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            教学研讨
            <span className="text-sm font-normal text-slate-500">({comments.length})</span>
          </h2>

          {/* 发表评论 */}
          {isAuthenticated ? (
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <Textarea
                  placeholder="分享您对该资源的学习心得或建议..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="rounded-xl border-blue-100 bg-slate-50 focus:border-blue-400 focus:ring-blue-400 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !commentText.trim()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
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

          {/* 评论列表 */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">暂无评论，来发表第一条评论吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    {comment.avatar ? (
                      <img src={comment.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{comment.username}</span>
                      {comment.role === 'TEACHER' && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">老师</Badge>
                      )}
                      <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                  {user && (user.id === comment.userId || user.role === 'TEACHER') && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除评论"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
