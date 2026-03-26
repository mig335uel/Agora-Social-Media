-- 1) RPC para Like/Unlike
CREATE OR REPLACE FUNCTION public.toggle_like(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
  v_liked boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.likes WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Quitar Like
    DELETE FROM public.likes WHERE post_id = p_post_id AND user_id = v_user_id;
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_post_id;
    v_liked := false;
  ELSE
    -- Dar Like
    INSERT INTO public.likes (post_id, user_id) VALUES (p_post_id, v_user_id);
    UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_post_id;
    v_liked := true;
  END IF;

  -- El trigger 'likes_after_insert' (si existe) se encargará de viral_score e intereses
  -- Si no existe, llama explícitamente:
  PERFORM public.calculate_viral_score(p_post_id);

  RETURN jsonb_build_object('liked', v_liked);
END;
$$;

-- 2) RPC para Repost/Unrepost
CREATE OR REPLACE FUNCTION public.toggle_repost(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
  v_reposted boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.reposts WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Quitar Repost
    DELETE FROM public.reposts WHERE post_id = p_post_id AND user_id = v_user_id;
    UPDATE public.posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = p_post_id;
    v_reposted := false;
  ELSE
    -- Crear Repost
    INSERT INTO public.reposts (post_id, user_id) VALUES (p_post_id, v_user_id);
    UPDATE public.posts SET reposts_count = COALESCE(reposts_count, 0) + 1 WHERE id = p_post_id;
    v_reposted := true;
  END IF;

  RETURN jsonb_build_object('reposted', v_reposted);
END;
$$;

-- 3) RPC para Share
CREATE OR REPLACE FUNCTION public.record_post_share(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = p_post_id;
  -- Podrías registrar la interacción en user_interactions aquí si lo deseas
END;
$$;
