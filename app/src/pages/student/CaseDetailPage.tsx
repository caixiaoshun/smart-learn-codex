import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useCaseStore } from '@/stores/caseStore';
import { useResourceStore } from '@/stores/resourceStore';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Loader2, MessageCircle, Send } from 'lucide-react';
import type { Case, Comment, Resource } from '@/types';

type DetailMode = 'case' | 'resource' | null;

function PDFPreview({ url }: { url: string }) {
  return <iframe src={url} className="h-[520px] w-full rounded-md border" title="PDF Preview" />;
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const caseStore = useCaseStore();
  const resourceStore = useResourceStore();

  const [mode, setMode] = useState<DetailMode>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [resourceData, setResourceData] = useState<Resource | null>(null);
  const [resourcePreview, setResourcePreview] = useState<{ type: string; url?: string; content?: any } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMode(null);
    setCaseData(null);
    setResourceData(null);
    setResourcePreview(null);

    try {
      try {
        const caseDetail = await caseStore.fetchCaseDetail(id);
        setMode('case');
        setCaseData(caseDetail);
      } catch {
        const resourceDetail = await resourceStore.fetchResourceDetail(id);
        setMode('resource');
        setResourceData(resourceDetail);
        if (resourceDetail.filePath) {
          const preview = await resourceStore.previewResourceFile(id);
          setResourcePreview(preview);
        }
        resourceStore.recordView(id);
      }
    } catch {
      toast.error('获取详情失败，请确认链接是否有效');
      setMode(null);
    } finally {
      setLoading(false);
    }
  }, [id, caseStore, resourceStore]);

  const loadComments = useCallback(async () => {
    if (!id || !mode) return;
    try {
      const list = mode === 'case' ? await caseStore.fetchComments(id) : await resourceStore.fetchComments(id);
      setComments(list as Comment[]);
    } catch {
      setComments([]);
    }
  }, [id, mode, caseStore, resourceStore]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!id || !isAuthenticated || !mode) return;
    const check = async () => {
      const status = mode === 'case' ? await caseStore.checkBookmark(id) : await resourceStore.checkBookmark(id);
      setIsBookmarked(status);
    };
    check();
  }, [id, isAuthenticated, mode, caseStore, resourceStore]);

  const handleBookmark = async () => {
    if (!id || !mode) return;
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }
    setBookmarkLoading(true);
    try {
      if (mode === 'case') {
        if (isBookmarked) await caseStore.unbookmarkCase(id);
        else await caseStore.bookmarkCase(id);
      } else if (isBookmarked) {
        await resourceStore.unbookmarkResource(id);
      } else {
        await resourceStore.bookmarkResource(id);
      }
      setIsBookmarked((v) => !v);
      toast.success(isBookmarked ? '已取消收藏' : '收藏成功');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !mode || !commentText.trim()) return;
    if (!isAuthenticated) {
      toast.error('请先登录后再评论');
      return;
    }
    setCommentLoading(true);
    try {
      const content = commentText.trim();
      const comment = mode === 'case' ? await caseStore.addComment(id, content) : await resourceStore.addComment(id, content);
      setComments((prev) => [comment as Comment, ...prev]);
      setCommentText('');
      toast.success('评论已发布');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !mode) return;
    try {
      if (mode === 'case') await caseStore.deleteComment(id, commentId);
      else await resourceStore.deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('评论已删除');
    } catch {
      toast.error('删除评论失败');
    }
  };

  const title = mode === 'case' ? caseData?.title : resourceData?.title;
  const description = mode === 'case' ? caseData?.description : resourceData?.description;
  const tags = mode === 'case' ? caseData?.tags || [] : resourceData?.tags || [];

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!title || !mode) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />返回</Button>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">详情不存在或已被删除。</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />返回</Button>
        <Button variant="outline" className="gap-2" onClick={handleBookmark} disabled={bookmarkLoading}>
          {bookmarkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {isBookmarked ? '已收藏' : '收藏'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <Badge variant="secondary">{mode === 'case' ? '案例详情' : '资源详情'}</Badge>
            {mode === 'resource' && resourceData?.type && <Badge variant="outline">{resourceData.type}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'case' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3 text-sm">分类：{caseData?.category || '-'}</div>
                <div className="rounded-md bg-slate-50 p-3 text-sm">难度：{caseData?.difficulty || '-'}</div>
                <div className="rounded-md bg-slate-50 p-3 text-sm">浏览：{caseData?.views ?? 0}</div>
              </div>
              {caseData?.content && <div className="whitespace-pre-wrap rounded-md border p-4 text-sm leading-6">{caseData.content}</div>}
              {caseData?.codeExample && <pre className="overflow-auto rounded-md bg-[#1e1e1e] p-4 text-xs text-slate-100">{caseData.codeExample}</pre>}
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3 text-sm">分类：{resourceData?.category || '-'}</div>
                <div className="rounded-md bg-slate-50 p-3 text-sm">积分：{resourceData?.points ?? 0}</div>
                <div className="rounded-md bg-slate-50 p-3 text-sm">浏览：{resourceData?.views ?? 0}</div>
              </div>
              {resourceData?.url && (
                <a href={resourceData.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <ExternalLink className="h-4 w-4" />打开外部资源
                </a>
              )}
              {resourcePreview?.type === 'pdf' && resourcePreview.url && <PDFPreview url={resourcePreview.url} />}
              {resourcePreview?.type === 'ipynb' && <pre className="max-h-[520px] overflow-auto rounded-md border bg-slate-50 p-3 text-xs">{JSON.stringify(resourcePreview.content, null, 2)}</pre>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />评论区（{comments.length}）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="写下你的想法..." rows={3} />
            <Button onClick={handleSubmitComment} disabled={commentLoading || !commentText.trim()} className="gap-2">
              {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}发表评论
            </Button>
          </div>
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{comment.username}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>删除</Button>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">暂无评论</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
