import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut, User as UserIcon, PlusCircle, MessageSquare, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('supabase.auth.token'); // More targeted clear if needed
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <MessageSquare size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">FeedbackByAll</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-slate-600 dark:text-slate-400">
          <Link to="/" className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">홈</Link>
          {user && (
            <Link to="/mypage" className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">마이페이지</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {user ? (
            <>
              <Link
                to="/upload"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
              >
                <PlusCircle size={18} />
                <span className="hidden xs:inline">업로드</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition-colors"
                title="로그아웃"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              <LogIn size={18} />
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
