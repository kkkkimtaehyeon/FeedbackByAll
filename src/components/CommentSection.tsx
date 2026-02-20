import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { MessageSquare, Send, User, ShieldCheck, Loader2, Edit2, Trash2, X, Check, ThumbsUp, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getAvatarFallback } from '../lib/utils';
import clsx from 'clsx';

interface CommentSectionProps {
  postId: string;
  feedbackRequest: string;
}

export default function CommentSection({ postId, feedbackRequest }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [targetSection, setTargetSection] = useState('General Feedback');
  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Edit State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Reply State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [postId, user]);

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (email, full_name, avatar_url),
        comment_helpful (user_id)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      // Map to include is_helpful for current user
      const mappedComments = (data as any[]).map(comment => ({
        ...comment,
        is_helpful: comment.comment_helpful?.some((h: any) => h.user_id === user?.id)
      }));
      setComments(mappedComments);
    }
  }

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    if (e) e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setLoading(true);
    const shouldBeAnonymous = !user || isAnonymous;

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: shouldBeAnonymous ? null : user.id,
        anonymous_name: shouldBeAnonymous ? `Anonymous Owl ${Math.floor(Math.random() * 1000)}` : null,
        content: content,
        target_section: parentId ? null : (targetSection === 'General Feedback' ? null : targetSection),
        parent_id: parentId
      });

    if (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } else {
      if (parentId) {
        setReplyContent('');
        setReplyingToId(null);
      } else {
        setNewComment('');
      }
      fetchComments();
      setIsAnonymous(false);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    } else {
      fetchComments();
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from('comments')
      .update({ content: editContent })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    } else {
      setEditingCommentId(null);
      fetchComments();
    }
  };

  const handleHelpfulToggle = async (commentId: string) => {
    if (!user) {
      alert('도움이 됐어요 투표를 하려면 로그인이 필요합니다.');
      return;
    }

    const { data: newCount, error } = await supabase.rpc('toggle_comment_helpful', {
      p_comment_id: commentId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error toggling helpful status:', error);
    } else {
      // Optimistically update or just re-fetch
      // Let's re-fetch for simplicity and consistency
      fetchComments();
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user && user.id === comment.user_id;
    const isEditing = editingCommentId === comment.id;
    const isReplying = replyingToId === comment.id;

    return (
      <div key={comment.id} className={clsx("flex gap-4 group", isReply && "ml-12 mt-4")}>
        <div className={clsx(
          "rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden",
          isReply ? "size-8" : "size-10"
        )}>
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : comment.user_id ? (
            <span className={clsx("font-bold text-blue-600", isReply ? "text-[10px]" : "text-xs")}>
              {getAvatarFallback(comment.profiles?.full_name || comment.profiles?.email)}
            </span>
          ) : (
            <User size={isReply ? 16 : 20} />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {comment.user_id ? (comment.profiles?.full_name || '사용자') : comment.anonymous_name}
              </span>
              {comment.target_section && (
                <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                  Re: {comment.target_section}
                </span>
              )}
              {!comment.user_id && (
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                  게스트
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
              </span>
              {isOwner && !isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(comment)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(comment.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-blue-200 dark:border-blue-900 ring-2 ring-blue-50 dark:ring-blue-900/10">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm p-1 resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setEditingCommentId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                  <X size={14} />
                </button>
                <button onClick={() => handleUpdate(comment.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => handleHelpfulToggle(comment.id)}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors border",
                    comment.is_helpful
                      ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                  )}
                >
                  <ThumbsUp size={12} className={comment.is_helpful ? "fill-current" : ""} />
                  도움이 됐어요 {comment.helpful_count > 0 && comment.helpful_count}
                </button>

                {!isReply && (
                  <button
                    onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <Reply size={12} />
                    답글 달기
                  </button>
                )}
              </div>
            </>
          )}

          {isReplying && (
            <div className="mt-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <textarea
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[80px] resize-none"
                placeholder="답글을 남겨주세요..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setReplyingToId(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={(e) => handleSubmit(e, comment.id)}
                  disabled={loading || !replyContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  답글 등록
                </button>
              </div>
            </div>
          )}

          {/* Render Replies */}
          {comments
            .filter(reply => reply.parent_id === comment.id)
            .map(reply => renderComment(reply, true))}
        </div>
      </div>
    );
  };

  const parentComments = comments.filter(c => !c.parent_id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600" />
          피드백 ({comments.length})
        </h3>
      </div>

      <div className="space-y-6">
        {parentComments.map(comment => renderComment(comment))}

        {comments.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            아직 피드백이 없습니다. 첫 번째로 의견을 공유해 보세요!
          </div>
        )}
      </div>

      {/* Comment Input */}
      <form onSubmit={(e) => handleSubmit(e)} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-lg">
        <div className="space-y-4">
          <textarea
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[100px] resize-none"
            placeholder={user && !isAnonymous ? "전문적인 피드백을 공유해 주세요..." : "익명으로 피드백 공유하기..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {user && !isAnonymous ? (
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="max-w-[150px] truncate" title={user.email}>작성자: <strong>{user.email}</strong></span>
                  </div>
                ) : (
                  <span>익명으로 작성 중</span>
                )}
              </div>

              {user && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={clsx(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    isAnonymous ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white"
                  )}>
                    {isAnonymous && <Check size={10} />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                  />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">익명</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> 등록</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
