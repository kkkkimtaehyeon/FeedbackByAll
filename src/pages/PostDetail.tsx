import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Post, Category } from '../types';
import { ChevronLeft, Share2, FileText, Info, Edit2, Trash2, Save, X, Globe, Lock, Eye } from 'lucide-react';
import CommentSection from '../components/CommentSection.tsx';
import { motion } from 'motion/react';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'Resume' as Category,
    feedback_request: '',
    is_public: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  async function fetchPost() {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (email, full_name, avatar_url),
        views_count
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      navigate('/');
    } else {
      setPost(data);
      setEditForm({
        title: data.title,
        category: data.category,
        feedback_request: data.feedback_request,
        is_public: data.is_public
      });
      setLoading(false);

      // Unique View Tracking
      handleViewTracking(id);
    }
  }

  const handleViewTracking = async (postId: string) => {
    try {
      const viewedKey = 'viewed_posts';
      const viewedPosts = JSON.parse(localStorage.getItem(viewedKey) || '[]');

      if (user) {
        // Logged-in user: RPC handles uniqueness via post_views table
        await supabase.rpc('increment_post_view', {
          p_post_id: postId,
          p_user_id: user.id
        });
      } else {
        // Guest user: Prevent simple refresh spam using LocalStorage
        if (!viewedPosts.includes(postId)) {
          await supabase.rpc('increment_post_view', {
            p_post_id: postId
          });
          viewedPosts.push(postId);
          localStorage.setItem(viewedKey, JSON.stringify(viewedPosts));
        }
      }
    } catch (err) {
      console.error('Error incrementing view count:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    setSaving(true);
    const { error } = await supabase.from('posts').delete().eq('id', post?.id);

    if (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
      setSaving(false);
    } else {
      navigate('/');
    }
  };

  const handleUpdate = async () => {
    if (!post) return;
    setSaving(true);

    const { error } = await supabase
      .from('posts')
      .update({
        title: editForm.title,
        category: editForm.category,
        feedback_request: editForm.feedback_request,
        is_public: editForm.is_public
      })
      .eq('id', post.id);

    if (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post');
    } else {
      setPost({ ...post, ...editForm });
      setIsEditing(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center">불러오는 중...</div>;
  if (!post) return <div className="text-center py-20">게시물을 찾을 수 없습니다.</div>;

  const isOwner = user?.id === post.user_id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Document Viewer */}
      <div className="lg:col-span-8 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft size={16} />
          피드로 돌아가기
        </Link>

        {isEditing ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-200 dark:border-blue-900 ring-2 ring-blue-100 dark:ring-blue-900/20 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-blue-600">게시물 수정</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">제목</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">카테고리</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value as Category })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Resume">이력서</option>
                    <option value="Portfolio">포트폴리오</option>
                    <option value="Cover Letter">자기소개서</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">공개 여부</label>
                  <button
                    onClick={() => setEditForm({ ...editForm, is_public: !editForm.is_public })}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${editForm.is_public
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                      }`}
                  >
                    {editForm.is_public ? <><Globe size={18} /> 전체 공개</> : <><Lock size={18} /> 일부 공개 (링크 전용)</>}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">피드백 요청 사항</label>
                <textarea
                  rows={4}
                  value={editForm.feedback_request}
                  onChange={e => setEditForm({ ...editForm, feedback_request: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2"
                >
                  <Save size={18} />
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="size-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
                  {!post.is_public && (
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock size={12} /> 일부 공개
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-slate-500">
                    작성자: <span className="font-bold text-slate-900 dark:text-white">{post.profiles?.full_name || post.profiles?.email}</span>
                  </p>
                  <div className="flex items-center gap-1 text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3 ml-1">
                    <Eye size={14} />
                    <span className="text-sm font-medium">{post.views_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 hover:text-blue-600 transition-colors"
                    title="Edit Post"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 hover:text-red-600 transition-colors"
                    title="Delete Post"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mock PDF Viewer */}
        <div className="aspect-[1/1.414] bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 relative group">
          <div className="absolute inset-0 flex items-center justify-center">
            <iframe
              src={`${post.file_url}#toolbar=0`}
              className="w-full h-full border-none"
              title="Resume Viewer"
            />
          </div>
          {/* Overlay for interaction if needed */}
          <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/20 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Context & Feedback */}
      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <Info size={20} />
            <h2>피드백 요청</h2>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap">
              "{post.feedback_request}"
            </p>
          </div>
        </div>

        <CommentSection postId={post.id} feedbackRequest={post.feedback_request} />
      </aside>
    </div>
  );
}
