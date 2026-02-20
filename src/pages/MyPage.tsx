import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Post, Comment } from '../types';
import PostCard from '../components/PostCard.tsx';
import { FileText, MessageSquare, Settings, User, LayoutDashboard, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function MyPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (email, full_name, avatar_url),
          comments (count),
          views_count
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsData) {
        setPosts(postsData.map(p => ({
          ...p,
          _count: { comments: p.comments?.[0]?.count || 0 }
        })));
      }

      // Fetch user's comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          *,
          posts (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (commentsData) setComments(commentsData);

      setLoading(false);
    }

    fetchData();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-sm">
            <div className="size-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mx-auto border-4 border-white dark:border-slate-800 shadow-lg">
              <User size={40} />
            </div>
            <div>
              <h2 className="font-bold text-lg">{user?.email?.split('@')[0]}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('posts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'posts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
            >
              <LayoutDashboard size={18} />
              나의 게시물
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'comments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
            >
              <MessageSquare size={18} />
              나의 댓글
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              {activeTab === 'posts' ? '내가 업로드한 문서' : '최근 작성한 피드백'}
            </h1>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {activeTab === 'posts' ? `${posts.length}개` : `${comments.length}개`}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : activeTab === 'posts' ? (
            posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {posts.map((post: Post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">아직 업로드한 문서가 없습니다.</p>
                <Link to="/upload" className="text-blue-600 font-bold hover:underline mt-2 inline-block">지금 업로드하기</Link>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <Link
                    key={comment.id}
                    to={`/post/${comment.post_id}`}
                    className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-500/50 transition-all shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 group-hover:text-blue-600 transition-colors">
                          <FileText size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">
                          게시물: {(comment as any).posts?.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic line-clamp-2">
                      "{comment.content}"
                    </p>
                  </Link>
                ))
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-500">아직 작성한 피드백이 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
