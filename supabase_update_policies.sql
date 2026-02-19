-- Allow anyone to read ANY post (so direct links to private posts work)
-- But the frontend will filter 'is_public=true' for the home page list.
DROP POLICY IF EXISTS "Public posts are viewable by everyone." ON posts;
CREATE POLICY "Public and Unlisted posts are viewable by everyone." ON posts FOR SELECT USING (true);

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments." ON comments FOR UPDATE USING (auth.uid() = user_id);

-- Verify: Ensure 'is_public' column defaults to true, but can be set to false.
-- (Already exists in schema, just a note)
