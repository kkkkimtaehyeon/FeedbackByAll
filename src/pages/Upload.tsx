import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { Upload as UploadIcon, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Resume');
  const [feedbackRequest, setFeedbackRequest] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Create Post in Database
      const { error: dbError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title,
          category,
          feedback_request: feedbackRequest,
          is_public: isPublic,
          file_url: publicUrl,
        });

      if (dbError) throw dbError;

      navigate('/');
    } catch (err: any) {
      setError(err.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    'Resume': '이력서',
    'Portfolio': '포트폴리오',
    'Cover Letter': '자기소개서'
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-black tracking-tight">문서 업로드</h1>
        <p className="text-slate-500">커뮤니티로부터 건설적인 피드백을 받아보세요.</p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8"
      >
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Project Title */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">프로젝트 제목</label>
          <input
            type="text"
            required
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 transition-all"
            placeholder="예: 시니어 프로덕트 디자이너 이력서 2024"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* File Upload Zone */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">문서 업로드 (PDF)</label>
          <div className={`relative group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer px-6 py-12 ${file ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}>
            <div className={`size-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${file ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              }`}>
              {file ? <CheckCircle2 size={32} /> : <UploadIcon size={32} />}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{file ? file.name : '클릭하여 업로드하거나 파일을 여기로 끌어다 놓으세요'}</p>
              <p className="text-sm text-slate-500">PDF 최대 10MB</p>
            </div>
            <input
              type="file"
              accept=".pdf"
              required
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">카테고리</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Resume', 'Portfolio', 'Cover Letter'] as const).map((cat) => (
              <label key={cat} className="cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  className="peer sr-only"
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                />
                <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 peer-checked:text-blue-600 hover:border-blue-500/50 transition-all">
                  <FileText size={24} />
                  <span className="font-bold text-sm">{categoryLabels[cat]}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Feedback Request */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            어떤 구체적인 피드백이 필요하신가요?
          </label>
          <textarea
            required
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 transition-all min-h-[120px]"
            placeholder="예: 가독성이 좋나요? 핵심 성과들이 잘 드러나 있나요?"
            value={feedbackRequest}
            onChange={(e) => setFeedbackRequest(e.target.value)}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-4 pt-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">공개 설정</label>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="visibility"
                className="mt-1 text-blue-600 focus:ring-blue-500"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">전체 공개</span>
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">추천</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">모든 사용자에게 공개됩니다. 가장 빠르게 피드백을 받을 수 있습니다.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="visibility"
                className="mt-1 text-blue-600 focus:ring-blue-500"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
              />
              <div>
                <span className="font-bold text-sm">일부 공개 / 링크 공유</span>
                <p className="text-xs text-slate-500 mt-1">본인과 링크를 가진 사람에게만 보입니다.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-6 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : '업로드 및 피드백 요청'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
