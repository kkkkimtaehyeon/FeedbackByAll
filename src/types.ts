export type Category = 'Resume' | 'Portfolio' | 'Cover Letter';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  category: Category;
  feedback_request: string;
  is_public: boolean;
  created_at: string;
  profiles?: Profile;
  views_count: number;
  _count?: {
    comments: number;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id?: string;
  anonymous_name?: string;
  content: string;
  target_section?: string;
  created_at: string;
  parent_id?: string;
  helpful_count: number;
  is_helpful?: boolean;
  profiles?: Profile;
}
