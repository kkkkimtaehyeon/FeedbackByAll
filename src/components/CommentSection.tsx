import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { MessageSquare, Send, User, ShieldCheck, Loader2, Edit2, Trash2, X, Check } from 'lucide-react';
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

  useEffect(() => {
    fetchComments();
  }, [postId]);

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (email, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) console.error('Error fetching comments:', error);
    else setComments(data);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);

    // Determine user_id and anonymous_name based on user choice
    // If user is logged in AND chooses anonymous -> user_id = null (or handle specific logic if we want to track it internally but hide it publicly. 
    // The requirement says "Logined user can choose anonymous". Use null user_id simplifies "anonymousness" but loses tracking.
    // However, the schema allows user_id to be null.
    // If we want to allow the USER to see their own anonymous comments as "theirs" later, we'd need a separate flag.
    // For now, I will treat "Anonymous" as fully anonymous (user_id = null) to be safe, OR I can keep user_id but add 'anonymous_name' and use that for display.
    // Schema: comments has user_id, anonymous_name.
    // If I set user_id, RLS might show it. The current UI uses `user_id ? profile : anonymous`.
    // Let's set user_id = null if they choose anonymous, ensuring 100% privacy publicly.

    const shouldBeAnonymous = !user || isAnonymous;

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: shouldBeAnonymous ? null : user.id,
        anonymous_name: shouldBeAnonymous ? `Anonymous Owl ${Math.floor(Math.random() * 1000)}` : null,
        content: newComment,
        target_section: targetSection === 'General Feedback' ? null : targetSection,
      });

    if (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } else {
      setNewComment('');
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600" />
          피드백 ({comments.length})
        </h3>
      </div>

      <div className="space-y-6">
        {comments.map((comment) => {
          const isOwner = user && user.id === comment.user_id;
          const isEditing = editingCommentId === comment.id;

          return (
            <div key={comment.id} className="flex gap-4 group">
              <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden">
                {comment.profiles?.avatar_url ? (
                  <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : comment.user_id ? (
                  <span className="text-xs font-bold text-blue-600">{getAvatarFallback(comment.profiles?.full_name || comment.profiles?.email)}</span>
                ) : (
                  <User size={20} />
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
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            아직 피드백이 없습니다. 첫 번째로 의견을 공유해 보세요!
          </div>
        )}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-lg">
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
                    <span>작성자: <strong>{user.email}</strong></span>
                  </div>
                ) : (
                  <span>익명으로 작성 중</span>
                )}
              </div>

              {user && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAnonymous ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
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
