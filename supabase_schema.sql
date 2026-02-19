-- 1. Profiles table (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Posts table
create table posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  file_url text not null,
  category text check (category in ('Resume', 'Portfolio', 'Cover Letter')) not null,
  feedback_request text not null,
  is_public boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for posts
alter table posts enable row level security;
create policy "Public posts are viewable by everyone." on posts for select using (is_public = true);
create policy "Users can view their own private posts." on posts for select using (auth.uid() = user_id);
create policy "Authenticated users can insert posts." on posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts." on posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts." on posts for delete using (auth.uid() = user_id);

-- 3. Comments table
create table comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  anonymous_name text,
  content text not null,
  target_section text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for comments
alter table comments enable row level security;
create policy "Comments are viewable by everyone." on comments for select using (true);
create policy "Anyone can insert comments." on comments for insert with check (true);
create policy "Users can delete own comments." on comments for delete using (auth.uid() = user_id);

-- 4. Storage Bucket
-- Create a bucket named 'documents' in Supabase Storage and set it to public.
-- Add policies to allow authenticated users to upload to 'documents' bucket.
