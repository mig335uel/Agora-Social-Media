create function rls_auto_enable() returns event_trigger
    security definer
    SET search_path = pg_catalog
    language plpgsql
as
$$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

alter function rls_auto_enable() owner to postgres;

grant execute on function rls_auto_enable() to anon;

grant execute on function rls_auto_enable() to authenticated;

grant execute on function rls_auto_enable() to service_role;

create function registrar_retencion_lote(payload jsonb) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  -- PASO 1: Guardar cuánto tiempo miró cada post (Actualiza si ya lo había visto antes)
  INSERT INTO public.user_interactions (user_id, post_id, dwell_time_seconds, created_at)
  SELECT 
    auth.uid(), 
    (x->>'post_id')::UUID, 
    (x->>'dwell_time_seconds')::INT, 
    now()
  FROM jsonb_array_elements(payload) AS x
  ON CONFLICT (user_id, post_id) 
  DO UPDATE SET 
    -- Si vuelve a ver el post, le sumamos el tiempo nuevo al que ya tenía
    dwell_time_seconds = user_interactions.dwell_time_seconds + EXCLUDED.dwell_time_seconds,
    created_at = now();

  -- PASO 2: EL APRENDIZAJE DE TEMÁTICAS (La magia real)
  -- Cruzamos los posts que acaba de ver con las categorías de esos posts
  INSERT INTO public.user_interests (user_id, category, interest_score)
  SELECT 
    auth.uid(), 
    pt.topic, 
    -- Fórmula de retención: 1 punto de interés por cada 5 segundos de visualización
    -- Usamos GREATEST para asegurar que al menos sume 1 punto si superó el filtro
    GREATEST(1, ((x->>'dwell_time_seconds')::INT / 5))
  FROM jsonb_array_elements(payload) AS x
  JOIN public.post_topics pt ON pt.post_id = (x->>'post_id')::UUID
  -- Filtro anti-scroll: Solo aprendemos si se quedó mirando más de 3 segundos
  WHERE (x->>'dwell_time_seconds')::INT >= 3
  ON CONFLICT (user_id, category)
  DO UPDATE SET 
    -- Sumamos los nuevos puntos al perfil de gustos del usuario
    interest_score = user_interests.interest_score + EXCLUDED.interest_score;

END;
$$;

alter function registrar_retencion_lote(unknown) owner to postgres;

grant execute on function registrar_retencion_lote(unknown) to anon;

grant execute on function registrar_retencion_lote(unknown) to authenticated;

grant execute on function registrar_retencion_lote(unknown) to service_role;

create function upsert_trend(trends jsonb) returns void
    language plpgsql
as
$$
BEGIN
  INSERT INTO trending_topics (topic_name, category, region, volume_score, expires_at)
  SELECT 
    (elem->>'topic_name')::TEXT, 
    (elem->>'category')::TEXT, 
    'Tendencia en España', -- Región fija por ahora
    1, 
    (elem->>'expires_at')::TIMESTAMPTZ -- Pasamos la fecha de expiración calculada
  FROM jsonb_array_elements(trends) AS elem
  ON CONFLICT (topic_name) 
  DO UPDATE SET 
    volume_score = trending_topics.volume_score + 1,
    expires_at = EXCLUDED.expires_at; -- Actualizamos la expiración también
END;
$$;

alter function upsert_trend(unknown) owner to postgres;

grant execute on function upsert_trend(unknown) to anon;

grant execute on function upsert_trend(unknown) to authenticated;

grant execute on function upsert_trend(unknown) to service_role;

create function viral_score(p_post_id uuid) returns double precision
    language plpgsql
as
$$
DECLARE
  v_likes integer := 0;
  v_reposts integer := 0;
  v_replies integer := 0;
  v_impressions integer := 0;
  v_age_hours double precision := 1;
  v_trend_score double precision := 0;
  v_raw_score double precision := 0;
  v_norm_score double precision := 0;
BEGIN
  SELECT COALESCE(likes_count,0), COALESCE(reposts_count,0), COALESCE(replies_count,0), COALESCE(impressions_count,0), EXTRACT(EPOCH FROM (now() - created_at))/3600
  INTO v_likes, v_reposts, v_replies, v_impressions, v_age_hours
  FROM posts WHERE id = p_post_id;

  -- pull trend boost if exists
  SELECT COALESCE(volume_score,0) INTO v_trend_score FROM trending_topics WHERE topic_name IN (
    SELECT topic FROM post_topics WHERE post_id = p_post_id
  ) LIMIT 1;

  -- simple raw viral signal: weighted sum with recency decay
  v_raw_score := ( (v_likes * 1.0) + (v_reposts * 2.0) + (v_replies * 1.5) + (v_impressions * 0.1) ) / GREATEST(POWER(v_age_hours + 2, 1.2), 1);

  -- incorporate trend boost
  v_raw_score := v_raw_score * (1 + (v_trend_score / 100.0));

  -- normalize to 0..1 using a tunable sigmoid-like transform
  v_norm_score := (v_raw_score) / (v_raw_score + 10); -- simple normalization; adjust divisor as needed

  RETURN LEAST(GREATEST(v_norm_score,0),1);
END;
$$;

alter function viral_score(unknown) owner to postgres;

grant execute on function viral_score(unknown) to anon;

grant execute on function viral_score(unknown) to authenticated;

grant execute on function viral_score(unknown) to service_role;

create function compute_post_viral_score_trigger() returns trigger
    security definer
    language plpgsql
as
$$
DECLARE
  score double precision;
BEGIN
  -- Call existing viral_score function; handle NULLs safely
  BEGIN
    score := public.viral_score(NEW.id);
  EXCEPTION WHEN others THEN
    -- If viral_score function fails, set score to NULL and continue
    score := NULL;
  END;

  INSERT INTO public.post_viral_scores(post_id, viral_score, computed_at)
  VALUES (NEW.id, score, now())
  ON CONFLICT (post_id) DO UPDATE
  SET viral_score = EXCLUDED.viral_score,
      computed_at = EXCLUDED.computed_at;

  RETURN NEW;
END;
$$;

alter function compute_post_viral_score_trigger() owner to postgres;

grant execute on function compute_post_viral_score_trigger() to anon;

grant execute on function compute_post_viral_score_trigger() to authenticated;

grant execute on function compute_post_viral_score_trigger() to service_role;

create function get_for_you_feed(p_limit integer, p_offset integer)
    returns TABLE(id uuid, content text, media jsonb, created_at timestamp with time zone, likes_count integer, reposts_count integer, replies_count integer, user_id uuid, username text, display_name text, profile_picture_url text, rank_score double precision)
    language plpgsql
as
$$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH base_posts AS (
        SELECT 
            p.id, p.content, p.created_at, 
            p.likes_count, p.reposts_count, p.replies_count,
            u.id as user_id, u.username, u.display_name, u.profile_picture_url,
            (
                ((p.likes_count * 2 + p.reposts_count * 3 + p.replies_count + 1)::FLOAT / 
                POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2, 1.5))
                * 
                COALESCE((
                    SELECT 1 + (SUM(ui.interest_score)::FLOAT / 100)
                    FROM post_topics pt
                    JOIN user_interests ui ON pt.topic = ui.category
                    WHERE pt.post_id = p.id AND ui.user_id = v_user_id
                ), 1)
            ) as rank_score
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.parent_post_id IS NULL
    ),
    media_agg AS (
      SELECT mf.post_id,
        jsonb_agg(jsonb_build_object('media_url', mf.image, 'created_at', mf.created_at) ORDER BY mf.created_at DESC) AS media
      FROM public.media_feature mf
      GROUP BY mf.post_id
    )
    SELECT
        bp.id,
        bp.content,
        COALESCE(ma.media, '[]'::jsonb) AS media,
        bp.created_at,
        bp.likes_count,
        bp.reposts_count,
        bp.replies_count,
        bp.user_id,
        bp.username,
        bp.display_name,
        bp.profile_picture_url,
        bp.rank_score
    FROM base_posts bp
    LEFT JOIN media_agg ma ON bp.id = ma.post_id
    ORDER BY bp.rank_score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

alter function get_for_you_feed(unknown, unknown) owner to postgres;

grant execute on function get_for_you_feed(unknown, unknown) to anon;

grant execute on function get_for_you_feed(unknown, unknown) to authenticated;

grant execute on function get_for_you_feed(unknown, unknown) to service_role;

create function refresh_post_impressions(p_post_id uuid) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  UPDATE public.posts p
  SET impressions_count = sub.cnt
  FROM (
    SELECT post_id, COUNT(*)::bigint as cnt
    FROM public.user_interactions
    WHERE post_id = p_post_id
    GROUP BY post_id
  ) sub
  WHERE p.id = sub.post_id;

  -- If there are zero interactions, ensure impressions_count is zero
  UPDATE public.posts
  SET impressions_count = 0
  WHERE id = p_post_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_interactions ui WHERE ui.post_id = p_post_id
    );
END;
$$;

alter function refresh_post_impressions(unknown) owner to postgres;

grant execute on function refresh_post_impressions(unknown) to anon;

grant execute on function refresh_post_impressions(unknown) to authenticated;

grant execute on function refresh_post_impressions(unknown) to service_role;

create function refresh_all_post_impressions() returns void
    security definer
    language plpgsql
as
$$
BEGIN
  -- Update counts for posts that have interactions
  WITH counts AS (
    SELECT post_id, COUNT(*)::bigint AS cnt
    FROM public.user_interactions
    GROUP BY post_id
  )
  UPDATE public.posts p
  SET impressions_count = COALESCE(c.cnt, 0)
  FROM counts c
  WHERE p.id = c.post_id;

  -- For posts without interactions, set to 0
  UPDATE public.posts p
  SET impressions_count = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_interactions ui WHERE ui.post_id = p.id
  );
END;
$$;

alter function refresh_all_post_impressions() owner to postgres;

grant execute on function refresh_all_post_impressions() to anon;

grant execute on function refresh_all_post_impressions() to authenticated;

grant execute on function refresh_all_post_impressions() to service_role;

create function _increment_post_impressions() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  -- Only act when post_id is not null
  IF NEW.post_id IS NOT NULL THEN
    UPDATE public.posts
    SET impressions_count = impressions_count + 1
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

alter function _increment_post_impressions() owner to postgres;

grant execute on function _increment_post_impressions() to anon;

grant execute on function _increment_post_impressions() to authenticated;

grant execute on function _increment_post_impressions() to service_role;

create function _decrement_post_impressions() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  IF OLD.post_id IS NOT NULL THEN
    UPDATE public.posts
    SET impressions_count = GREATEST(impressions_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN OLD;
END;
$$;

alter function _decrement_post_impressions() owner to postgres;

grant execute on function _decrement_post_impressions() to anon;

grant execute on function _decrement_post_impressions() to authenticated;

grant execute on function _decrement_post_impressions() to service_role;

create function _move_post_impressions() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  -- If post_id changed, decrement old and increment new
  IF OLD.post_id IS DISTINCT FROM NEW.post_id THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET impressions_count = GREATEST(impressions_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET impressions_count = impressions_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

alter function _move_post_impressions() owner to postgres;

grant execute on function _move_post_impressions() to anon;

grant execute on function _move_post_impressions() to authenticated;

grant execute on function _move_post_impressions() to service_role;

create function calculate_viral_score(p_post_id uuid) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  INSERT INTO public.post_viral_scores (post_id, viral_score, created_at, computed_at)
  VALUES (
    p_post_id,
    (SELECT (2 * COALESCE(reposts_count,0)) + (3 * COALESCE(shares_count,0)) + (1 * COALESCE(likes_count,0)) + (1 * COALESCE(replies_count,0)) + ln(COALESCE(impressions_count,0) + 1)
     FROM public.posts WHERE id = p_post_id),
    now(),
    now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    viral_score = EXCLUDED.viral_score,
    computed_at = EXCLUDED.computed_at;
END;
$$;

alter function calculate_viral_score(unknown) owner to postgres;

grant execute on function calculate_viral_score(unknown) to service_role;

create function validate_post_metrics_update(p_post_id uuid, p_old_likes integer, p_old_replies integer, p_old_reposts integer, p_old_shares integer, p_new_likes integer, p_new_replies integer, p_new_reposts integer, p_new_shares integer, p_caller uuid, p_owner uuid) returns boolean
    security definer
    language sql
as
$$
  SELECT (
    p_caller IS NOT NULL
    AND p_caller = p_owner
    AND abs(p_new_likes - p_old_likes) <= 1
    AND abs(p_new_replies - p_old_replies) <= 1
    AND abs(p_new_reposts - p_old_reposts) <= 1
    AND abs(p_new_shares - p_old_shares) <= 1
  );
$$;

alter function validate_post_metrics_update(unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown) owner to postgres;

grant execute on function validate_post_metrics_update(unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown) to service_role;

create function posts_metrics_after_change() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  -- Only act when relevant counters changed (or on insert)
  PERFORM public.calculate_viral_score(COALESCE(NEW.id, OLD.id));

  -- Enqueue interest updates: if there's a user interacting, use tg_op to decide
  IF (TG_OP = 'INSERT') THEN
    -- no-op here; specific interaction tables handle interests
    NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If counters changed, nothing else here
    NULL;
  ELSIF (TG_OP = 'DELETE') THEN
    NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

alter function posts_metrics_after_change() owner to postgres;

grant execute on function posts_metrics_after_change() to service_role;

create function increment_user_interests_for_post(p_user_id uuid, p_post_id uuid) returns void
    security definer
    language plpgsql
as
$$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT topic FROM public.post_topics WHERE post_id = p_post_id LOOP
    INSERT INTO public.user_interests (user_id, category, interest_score)
    VALUES (p_user_id, t, 1)
    ON CONFLICT (user_id, category) DO UPDATE SET interest_score = user_interests.interest_score + 1;
  END LOOP;
END;
$$;

alter function increment_user_interests_for_post(unknown, unknown) owner to postgres;

grant execute on function increment_user_interests_for_post(unknown, unknown) to service_role;

create function likes_after_insert() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  -- when someone likes a post, increment their interests based on post_topics
  PERFORM public.increment_user_interests_for_post(NEW.user_id, NEW.post_id);
  -- also recalc viral score for the post
  PERFORM public.calculate_viral_score(NEW.post_id);
  RETURN NEW;
END;
$$;

alter function likes_after_insert() owner to postgres;

grant execute on function likes_after_insert() to service_role;

create function reposts_after_insert() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  PERFORM public.increment_user_interests_for_post(NEW.user_id, NEW.post_id);
  PERFORM public.calculate_viral_score(NEW.post_id);
  RETURN NEW;
END;
$$;

alter function reposts_after_insert() owner to postgres;

grant execute on function reposts_after_insert() to service_role;

create function user_interactions_after_insert() returns trigger
    security definer
    language plpgsql
as
$$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_user_interests_for_post(NEW.user_id, NEW.post_id);
    PERFORM public.calculate_viral_score(NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

alter function user_interactions_after_insert() owner to postgres;

grant execute on function user_interactions_after_insert() to service_role;

create function toggle_like(p_post_id uuid) returns jsonb
    security definer
    SET search_path = public
    language plpgsql
as
$$
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

alter function toggle_like(unknown) owner to postgres;

grant execute on function toggle_like(unknown) to anon;

grant execute on function toggle_like(unknown) to authenticated;

grant execute on function toggle_like(unknown) to service_role;

create function toggle_repost(p_post_id uuid) returns jsonb
    security definer
    SET search_path = public
    language plpgsql
as
$$
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

alter function toggle_repost(unknown) owner to postgres;

grant execute on function toggle_repost(unknown) to anon;

grant execute on function toggle_repost(unknown) to authenticated;

grant execute on function toggle_repost(unknown) to service_role;

create function record_post_share(p_post_id uuid) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  UPDATE public.posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = p_post_id;
  -- Podrías registrar la interacción en user_interactions aquí si lo deseas
END;
$$;

alter function record_post_share(unknown) owner to postgres;

grant execute on function record_post_share(unknown) to anon;

grant execute on function record_post_share(unknown) to authenticated;

grant execute on function record_post_share(unknown) to service_role;

create function increment_replies_count() returns trigger
    language plpgsql
as
$$
BEGIN
  IF (NEW.parent_post_id IS NOT NULL) THEN
    UPDATE posts
    SET replies_count = replies_count + 1
    WHERE id = NEW.parent_post_id;
  END IF;
  RETURN NEW;
END;
$$;

alter function increment_replies_count() owner to postgres;

grant execute on function increment_replies_count() to anon;

grant execute on function increment_replies_count() to authenticated;

grant execute on function increment_replies_count() to service_role;

create function decrement_replies_count() returns trigger
    language plpgsql
as
$$
BEGIN
  IF (OLD.parent_post_id IS NOT NULL) THEN
    UPDATE posts
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE id = OLD.parent_post_id;
  END IF;
  RETURN OLD;
END;
$$;

alter function decrement_replies_count() owner to postgres;

grant execute on function decrement_replies_count() to anon;

grant execute on function decrement_replies_count() to authenticated;

grant execute on function decrement_replies_count() to service_role;

create function get_my_chat_ids() returns SETOF uuid
    security definer
    SET search_path = public
    language sql
as
$$
  SELECT chat_id FROM chat_participants WHERE user_id = auth.uid();
$$;

alter function get_my_chat_ids() owner to postgres;

grant execute on function get_my_chat_ids() to anon;

grant execute on function get_my_chat_ids() to authenticated;

grant execute on function get_my_chat_ids() to service_role;

create function get_public_keys_for_users(target_user_ids uuid[])
    returns TABLE(id uuid, user_id uuid, public_device_key text)
    security definer
    SET search_path = public
    language sql
as
$$
  SELECT id, user_id, public_device_key 
  FROM devices 
  WHERE user_id = ANY(target_user_ids) 
  AND public_device_key IS NOT NULL;
$$;

alter function get_public_keys_for_users(unknown) owner to postgres;

grant execute on function get_public_keys_for_users(unknown) to anon;

grant execute on function get_public_keys_for_users(unknown) to authenticated;

grant execute on function get_public_keys_for_users(unknown) to service_role;

create function combine_feed_and_viral(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_personal_weight double precision DEFAULT 0.75, p_user_id uuid DEFAULT NULL::uuid, p_viral_weight double precision DEFAULT 0.25)
    returns TABLE(id uuid, content text, media jsonb, created_at timestamp with time zone, likes_count bigint, reposts_count bigint, replies_count bigint, user_id uuid, username text, display_name text, profile_picture_url text, is_verified boolean, rank_score double precision, viral_score double precision, combined_score double precision)
    language plpgsql
as
$$
DECLARE
    v_auth_txt text := (SELECT auth.uid());
BEGIN
    IF p_user_id IS NULL THEN
        IF v_auth_txt IS NULL OR v_auth_txt = '' THEN
            p_user_id := NULL;
        ELSE
            p_user_id := v_auth_txt::uuid;
        END IF;
    END IF;

    RETURN QUERY
        WITH base_f AS (
            SELECT * FROM public.get_for_you_feed(1000, 0)
        ),
             candidates AS (
                 SELECT f.*
                 FROM base_f f
                 WHERE (p_user_id IS NULL) OR f.user_id IS DISTINCT FROM p_user_id
             ),
             scored_posts AS (
                 SELECT
                     c.*,
                     COALESCE(public.viral_score(c.id), 0) as v_score
                 FROM candidates c
             ),
             media_agg AS (
                 SELECT mf.post_id,
                        jsonb_agg(jsonb_build_object('media_url', mf.image, 'post_id', mf.post_id) ORDER BY mf.created_at DESC) AS media_aggr
                 FROM public.media_feature mf
                 GROUP BY mf.post_id
             ),
             with_media AS (
                 SELECT
                     s.*,
                     media_agg.media_aggr AS media_from_agg,
                     u.is_verified
                 FROM scored_posts s
                          LEFT JOIN media_agg ON s.id = media_agg.post_id
                          LEFT JOIN public.users u ON u.id = s.user_id
             )
        SELECT
            w.id::uuid,
            w.content::text,
            COALESCE(w.media_from_agg, w.media, '[]'::jsonb) AS media,
            w.created_at::timestamptz,
            w.likes_count::bigint,
            w.reposts_count::bigint,
            w.replies_count::bigint,
            w.user_id::uuid,
            w.username::text,
            w.display_name::text,
            w.profile_picture_url::text,
            w.is_verified::boolean,
            w.rank_score::double precision,
            w.v_score::double precision as viral_score,
            (COALESCE(p_personal_weight, 0.75) * COALESCE(w.rank_score, 0) +
             COALESCE(p_viral_weight, 0.25) * COALESCE(w.v_score, 0))::double precision as combined_score
        FROM with_media w
        ORDER BY combined_score DESC
        LIMIT p_limit OFFSET p_offset;
END;
$$;

alter function combine_feed_and_viral(unknown, unknown, unknown, unknown, unknown) owner to postgres;

grant execute on function combine_feed_and_viral(unknown, unknown, unknown, unknown, unknown) to anon;

grant execute on function combine_feed_and_viral(unknown, unknown, unknown, unknown, unknown) to authenticated;

grant execute on function combine_feed_and_viral(unknown, unknown, unknown, unknown, unknown) to service_role;

