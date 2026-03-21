-- SQL to automatically increment replies_count on the parent post
-- Run this in your Supabase SQL Editor for a more robust solution than the application-level increment.

-- 1. Create the function
CREATE OR REPLACE FUNCTION increment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.parent_post_id IS NOT NULL) THEN
    UPDATE posts
    SET replies_count = replies_count + 1
    WHERE id = NEW.parent_post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_increment_replies_count ON posts;
CREATE TRIGGER tr_increment_replies_count
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION increment_replies_count();

-- 3. (Optional) SQL to decrement on delete
CREATE OR REPLACE FUNCTION decrement_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.parent_post_id IS NOT NULL) THEN
    UPDATE posts
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE id = OLD.parent_post_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_decrement_replies_count ON posts;
CREATE TRIGGER tr_decrement_replies_count
AFTER DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION decrement_replies_count();
