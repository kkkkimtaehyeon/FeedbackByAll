import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { MessageSquare, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getAvatarFallback } from '../lib/utils';

const categoryMap: Record<string, string> = {
  'Resume': '이력서',
  'Portfolio': '포트폴리오',
  'Cover Letter': '자기소개서'
};

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <Link
      to={`/post/${post.id}`}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
        <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700">
          <FileText size={48} />
        </div>
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[10px] font-bold tracking-wider text-slate-900 dark:text-white shadow-sm">
            {categoryMap[post.category] || post.category}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
          </p>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                getAvatarFallback(post.profiles?.full_name || post.profiles?.email)
              )}
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {post.profiles?.full_name || '익명'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <MessageSquare size={14} />
            <span className="text-xs font-semibold">{post._count?.comments || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PostCard;
