import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post, Category } from '../types';
import PostCard from '../components/PostCard.tsx';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext.tsx';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') as Category | null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    async function fetchPosts() {

      setLoading(true);

      let query = supabase
        .from('posts')
        .select(`
        *,
        profiles (email, full_name, avatar_url),
        comments (count),
        views_count
      `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      console.log("🔥 fetch error:", error);
      console.log("🔥 fetch data:", data);

      if (!error && data) {
        setPosts(data as any);
      }

      setLoading(false);
    }

    fetchPosts();
  }, [authLoading, categoryFilter, searchQuery]); // 🔥 authLoading 추가



  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]"
        >
          커리어 문서의 <span className="text-blue-600">가치를 높이세요</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          현직자들과 동료들로부터 이력서 및 포트폴리오에 대한 <br className="hidden sm:block" />
          전문적이고 실용적인 피드백을 받아보세요.
        </motion.p>


      </section>

      {/* Content Area */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            {([
              { label: '전체', value: 'All' },
              { label: '이력서', value: 'Resume' },
              { label: '포트폴리오', value: 'Portfolio' },
              { label: '자기소개서', value: 'Cover Letter' }
            ] as const).map(({ label, value }) => (
              <button
                key={value}
                onClick={() => {
                  if (value === 'All') {
                    searchParams.delete('category');
                  } else {
                    searchParams.set('category', value);
                  }
                  setSearchParams(searchParams);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${(value === 'All' && !categoryFilter) || value === categoryFilter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>


        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">게시물이 없습니다. 첫 번째로 업로드해 보세요!</p>
          </div>
        )}
      </section>
    </div>
  );
}
