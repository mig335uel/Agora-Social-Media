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
DECLARE
  v_likes integer := 0;
  v_reposts integer := 0;
  v_replies integer := 0;
  v_shares integer := 0;
  v_impressions integer := 0;
  v_age_hours double precision := 0.1;
  v_is_banned boolean := false;
  v_trend_score double precision := 0;
  v_raw_score double precision := 0;
  v_norm_score double precision := 0;
BEGIN
  SELECT
    COALESCE(likes_count, 0), COALESCE(reposts_count, 0), COALESCE(replies_count, 0),
    COALESCE(shares_count, 0), COALESCE(impressions_count, 0), is_banned,
    GREATEST(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 0.1)
  INTO v_likes, v_reposts, v_replies, v_shares, v_impressions, v_is_banned, v_age_hours
  FROM public.posts
  WHERE id = p_post_id;

  -- Si el post no existe (fue borrado) no hacemos nada; evita el bug viejo
  -- de dejar variables en NULL y propagar NULL al resto del cálculo.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Post baneado -> score a 0 explícitamente, no seguimos calculando.
  IF v_is_banned THEN
    INSERT INTO public.post_viral_scores (post_id, viral_score, created_at, computed_at)
    VALUES (p_post_id, 0, NOW(), NOW())
    ON CONFLICT (post_id) DO UPDATE SET viral_score = 0, computed_at = NOW();
    RETURN;
  END IF;

  -- Tendencia activa más fuerte asociada al post (con ORDER BY y filtro de
  -- expires_at; el viejo viral_score() hacía LIMIT 1 sin ORDER BY, lo que
  -- podía devolver una tendencia expirada o de bajo volumen al azar).
  SELECT COALESCE(volume_score, 0) INTO v_trend_score
  FROM public.trending_topics
  WHERE topic_name IN (SELECT topic FROM public.post_topics WHERE post_id = p_post_id)
    AND expires_at > NOW()
  ORDER BY volume_score DESC
  LIMIT 1;

  v_raw_score := (
      (v_likes * 1.0) + (v_reposts * 2.0) + (v_replies * 1.5) +
      (v_shares * 2.5) + (v_impressions * 0.05)
  ) / POWER(v_age_hours + 2.0, 1.25);

  IF v_trend_score > 0 THEN
      v_raw_score := v_raw_score * (1.0 + LEAST(v_trend_score / 50.0, 3.0));
  END IF;

  v_norm_score := v_raw_score / (v_raw_score + 8.0);

  INSERT INTO public.post_viral_scores (post_id, viral_score, created_at, computed_at)
  VALUES (p_post_id, LEAST(GREATEST(v_norm_score, 0.0), 1.0), NOW(), NOW())
  ON CONFLICT (post_id) DO UPDATE SET
    viral_score = EXCLUDED.viral_score,
    computed_at = EXCLUDED.computed_at;
END;
$$;

alter function calculate_viral_score(uuid) owner to postgres;

grant execute on function calculate_viral_score(uuid) to anon;

grant execute on function calculate_viral_score(uuid) to authenticated;

grant execute on function calculate_viral_score(uuid) to service_role;

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

create function get_for_you_feed(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
    returns TABLE(id uuid, content text, media jsonb, created_at timestamp with time zone, likes_count integer, reposts_count integer, replies_count integer, user_id uuid, username text, display_name text, profile_picture_url text, rank_score double precision)
    security definer
    language plpgsql
as
$$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH blocked_pairs AS (
        SELECT blocked_id AS uid FROM public.blocks WHERE blocker_id = v_user_id
        UNION
        SELECT blocker_id AS uid FROM public.blocks WHERE blocked_id = v_user_id
    ),
    muted_users AS (
        SELECT target_user_id AS uid FROM public.post_feedback
        WHERE user_id = v_user_id AND feedback_type = 'see_less_from_user' AND target_user_id IS NOT NULL
    ),
    hidden_posts AS (
        SELECT post_id FROM public.post_feedback
        WHERE user_id = v_user_id AND feedback_type = 'not_interested' AND post_id IS NOT NULL
    ),
    my_interests AS (
        -- Decaimiento temporal: half-life aproximado de 14 días.
        -- Un interés de hace 14 días vale la mitad que uno de hoy.
        SELECT
            category,
            interest_score * POWER(0.5, EXTRACT(EPOCH FROM (NOW() - updated_at)) / (14 * 86400.0)) AS decayed_score
        FROM public.user_interests
        WHERE user_id = v_user_id
    ),
    base_posts AS (
        SELECT
            p.id, p.content, p.created_at,
            p.likes_count, p.reposts_count, p.replies_count,
            u.id as user_id, u.username, u.display_name, u.profile_picture_url,
            (
                ((p.likes_count * 2 + p.reposts_count * 3 + p.replies_count * 2 + p.shares_count * 3 + 1)::FLOAT /
                POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2.0, 1.4))
                *
                COALESCE((
                    SELECT 1.0 + (LN(1.0 + SUM(GREATEST(mi.decayed_score, 0))) / 5.0)
                    FROM public.post_topics pt
                    JOIN my_interests mi ON pt.topic = mi.category
                    WHERE pt.post_id = p.id
                ), 1.0)
            ) as rank_score
        FROM public.posts p
        JOIN public.users u ON p.user_id = u.id
        WHERE p.parent_post_id IS NULL
          AND p.is_banned = false
          AND (v_user_id IS NULL OR u.id NOT IN (SELECT uid FROM blocked_pairs))
          AND (v_user_id IS NULL OR u.id NOT IN (SELECT uid FROM muted_users))
          AND (v_user_id IS NULL OR p.id NOT IN (SELECT post_id FROM hidden_posts))
          -- No mostrar cuentas privadas salvo que las sigas
          AND (u.is_private = false OR EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = v_user_id AND f.following_id = u.id
          ))
    ),
    social_boosts AS (
        SELECT
            bp.*,
            (
                bp.rank_score
                -- Boosts ADITIVOS en vez de multiplicativos encadenados:
                -- sigues al autor -> +150% del rank_score base
                -- un amigo dio like -> +50% adicional
                -- así un post ya bueno puede subir mucho, pero uno flojo
                -- de alguien que sigues no revienta el ranking con x10 seco.
                * (
                    1.0
                    + COALESCE((
                        SELECT 1.5 FROM public.follows f
                        WHERE f.follower_id = v_user_id AND f.following_id = bp.user_id
                        LIMIT 1
                    ), 0.0)
                    + COALESCE((
                        SELECT 0.5 FROM public.likes l
                        JOIN public.follows f ON f.following_id = l.user_id
                        WHERE f.follower_id = v_user_id AND l.post_id = bp.id
                        LIMIT 1
                    ), 0.0)
                )
            ) as boosted_rank_score
        FROM base_posts bp
    ),
    media_agg AS (
      SELECT mf.post_id,
        jsonb_agg(
            jsonb_build_object(
                'media_url', mf.image,
                'post_id', mf.post_id,
                'created_at', mf.created_at
            ) ORDER BY mf.created_at DESC
        ) AS media
      FROM public.media_feature mf
      GROUP BY mf.post_id
    )
    SELECT
        sb.id, sb.content,
        COALESCE(ma.media, '[]'::jsonb) AS media,
        sb.created_at, sb.likes_count, sb.reposts_count, sb.replies_count,
        sb.user_id, sb.username, sb.display_name, sb.profile_picture_url,
        sb.boosted_rank_score AS rank_score
    FROM social_boosts sb
    LEFT JOIN media_agg ma ON sb.id = ma.post_id
    ORDER BY sb.boosted_rank_score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

alter function get_for_you_feed(integer, integer) owner to postgres;

grant execute on function get_for_you_feed(integer, integer) to anon;

grant execute on function get_for_you_feed(integer, integer) to authenticated;

grant execute on function get_for_you_feed(integer, integer) to service_role;

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

create function increment_user_interests_for_post(p_user_id uuid, p_post_id uuid) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  INSERT INTO public.user_interests (user_id, category, interest_score, updated_at)
  SELECT p_user_id, pt.topic, 2.0, NOW() -- un like/repost equivale a ~8s de dwell time
  FROM public.post_topics pt
  WHERE pt.post_id = p_post_id
  ON CONFLICT (user_id, category) DO UPDATE SET
    interest_score = LEAST(user_interests.interest_score + EXCLUDED.interest_score, 500), -- techo defensivo
    updated_at = NOW();
END;
$$;

alter function increment_user_interests_for_post(uuid, uuid) owner to postgres;

grant execute on function increment_user_interests_for_post(uuid, uuid) to anon;

grant execute on function increment_user_interests_for_post(uuid, uuid) to authenticated;

grant execute on function increment_user_interests_for_post(uuid, uuid) to service_role;

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

grant execute on function likes_after_insert() to anon;

grant execute on function likes_after_insert() to authenticated;

grant execute on function likes_after_insert() to service_role;

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

grant execute on function posts_metrics_after_change() to anon;

grant execute on function posts_metrics_after_change() to authenticated;

grant execute on function posts_metrics_after_change() to service_role;

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

create function registrar_retencion_lote(payload jsonb) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  -- PASO 0: Registrar impresión granular (siempre, incluso con dwell_time bajo)
  INSERT INTO public.post_impressions (user_id, post_id, shown_at, source, dwell_time_seconds, clicked)
  SELECT
    auth.uid(),
    (x->>'post_id')::UUID,
    NOW(),
    COALESCE(x->>'source', 'home_feed'),
    NULLIF((x->>'dwell_time_seconds')::INT, 0),
    COALESCE((x->>'clicked')::BOOLEAN, false)
  FROM jsonb_array_elements(payload) AS x
  WHERE (x->>'post_id') IS NOT NULL;

  -- PASO 1: Guardar la permanencia visual acumulada del usuario (Dwell Time en segundos)
  INSERT INTO public.user_interactions (user_id, post_id, dwell_time_seconds, created_at)
  SELECT
    auth.uid(),
    (x->>'post_id')::UUID,
    (x->>'dwell_time_seconds')::INT,
    NOW()
  FROM jsonb_array_elements(payload) AS x
  WHERE (x->>'post_id') IS NOT NULL AND (x->>'dwell_time_seconds')::INT > 0
  ON CONFLICT (user_id, post_id)
  DO UPDATE SET
    dwell_time_seconds = user_interactions.dwell_time_seconds + EXCLUDED.dwell_time_seconds,
    created_at = NOW();

  -- PASO 2: Aprendizaje de Intereses Ponderado por Dwell Time
  -- Filtro de atención: solo aprende si el usuario permaneció al menos 2 segundos.
  -- Puntuación acotada: máximo 5 puntos por sesión para evitar sesgos extremos.
  INSERT INTO public.user_interests (user_id, category, interest_score, updated_at)
  SELECT
    auth.uid(),
    pt.topic,
    GREATEST(1, LEAST(5, (x->>'dwell_time_seconds')::INT / 4)),
    NOW()
  FROM jsonb_array_elements(payload) AS x
  JOIN public.post_topics pt ON pt.post_id = (x->>'post_id')::UUID
  WHERE (x->>'dwell_time_seconds')::INT >= 2
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    interest_score = user_interests.interest_score + EXCLUDED.interest_score,
    updated_at = NOW();

  -- PASO 3: Señal negativa implícita -- vista sin ningún engagement y dwell muy bajo
  -- (menos de 1 segundo) resta un poco de interés en el topic, para no encasillar
  -- al usuario en contenido que activamente scrollea rápido.
  INSERT INTO public.user_interests (user_id, category, interest_score, updated_at)
  SELECT
    auth.uid(),
    pt.topic,
    -0.5,
    NOW()
  FROM jsonb_array_elements(payload) AS x
  JOIN public.post_topics pt ON pt.post_id = (x->>'post_id')::UUID
  WHERE COALESCE((x->>'dwell_time_seconds')::INT, 0) < 1
    AND COALESCE((x->>'clicked')::BOOLEAN, false) = false
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    interest_score = GREATEST(0, user_interests.interest_score + EXCLUDED.interest_score),
    updated_at = NOW();

END;
$$;

alter function registrar_retencion_lote(jsonb) owner to postgres;

grant execute on function registrar_retencion_lote(jsonb) to anon;

grant execute on function registrar_retencion_lote(jsonb) to authenticated;

grant execute on function registrar_retencion_lote(jsonb) to service_role;

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

grant execute on function reposts_after_insert() to anon;

grant execute on function reposts_after_insert() to authenticated;

grant execute on function reposts_after_insert() to service_role;

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
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
     END IF;
  END LOOP;
END;
$$;

alter function rls_auto_enable() owner to postgres;

grant execute on function rls_auto_enable() to anon;

grant execute on function rls_auto_enable() to authenticated;

grant execute on function rls_auto_enable() to service_role;

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

create function truncate_trends() returns void
    security definer
    language plpgsql
as
$$
BEGIN
  -- Usamos CASCADE por si tuvieras claves foráneas (foreign keys) que dependan de ellas
  TRUNCATE TABLE trending_hashtags, trending_topics CASCADE;
END;
$$;

alter function truncate_trends() owner to postgres;

grant execute on function truncate_trends() to anon;

grant execute on function truncate_trends() to authenticated;

grant execute on function truncate_trends() to service_role;

create function upsert_trend(trends jsonb) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  INSERT INTO public.trending_topics (topic_name, category, region, volume_score, expires_at)
  SELECT
    LOWER((elem->>'topic_name')::TEXT),
    COALESCE((elem->>'category')::TEXT, 'General'),
    COALESCE((elem->>'region')::TEXT, 'Tendencia en España'),
    1,
    COALESCE((elem->>'expires_at')::TIMESTAMPTZ, NOW() + INTERVAL '48 hours')
  FROM jsonb_array_elements(trends) AS elem
  ON CONFLICT (topic_name)
  DO UPDATE SET
    volume_score = trending_topics.volume_score + 1,
    expires_at = GREATEST(trending_topics.expires_at, NOW() + INTERVAL '24 hours');
END;
$$;

alter function upsert_trend(jsonb) owner to postgres;

grant execute on function upsert_trend(jsonb) to anon;

grant execute on function upsert_trend(jsonb) to authenticated;

grant execute on function upsert_trend(jsonb) to service_role;

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

grant execute on function user_interactions_after_insert() to anon;

grant execute on function user_interactions_after_insert() to authenticated;

grant execute on function user_interactions_after_insert() to service_role;

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

grant execute on function validate_post_metrics_update(unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown) to anon;

grant execute on function validate_post_metrics_update(unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown) to authenticated;

grant execute on function validate_post_metrics_update(unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown) to service_role;

create function viral_score(p_post_id uuid) returns double precision
    security definer
    language plpgsql
as
$$
DECLARE
  v_score double precision;
BEGIN
  SELECT pvs.viral_score INTO v_score
  FROM public.post_viral_scores pvs
  JOIN public.posts p ON p.id = pvs.post_id
  WHERE pvs.post_id = p_post_id AND p.is_banned = false;

  -- Si aún no se ha calculado nunca (post recién creado, cero interacciones,
  -- ningún trigger disparado todavía), lo calculamos una vez al vuelo en
  -- vez de devolver NULL/0 engañoso.
  IF v_score IS NULL THEN
    PERFORM public.calculate_viral_score(p_post_id);
    SELECT pvs.viral_score INTO v_score FROM public.post_viral_scores pvs WHERE pvs.post_id = p_post_id;
  END IF;

  RETURN COALESCE(v_score, 0);
END;
$$;

alter function viral_score(uuid) owner to postgres;

grant execute on function viral_score(uuid) to anon;

grant execute on function viral_score(uuid) to authenticated;

grant execute on function viral_score(uuid) to service_role;

create function registrar_post_feedback(p_post_id uuid, p_feedback_type text, p_target_user_id uuid DEFAULT NULL::uuid, p_topic text DEFAULT NULL::text) returns void
    security definer
    language plpgsql
as
$$
BEGIN
  INSERT INTO public.post_feedback (user_id, post_id, target_user_id, feedback_type, topic)
  VALUES (auth.uid(), p_post_id, p_target_user_id, p_feedback_type, p_topic);

  -- Si es "ver menos de este tema", penaliza directamente el interés guardado
  IF p_feedback_type = 'see_less_topic' AND p_topic IS NOT NULL THEN
    UPDATE public.user_interests
    SET interest_score = GREATEST(0, interest_score * 0.3),
        updated_at = NOW()
    WHERE user_id = auth.uid() AND category = p_topic;
  END IF;
END;
$$;

alter function registrar_post_feedback(uuid, text, uuid, text) owner to postgres;

grant execute on function registrar_post_feedback(uuid, text, uuid, text) to anon;

grant execute on function registrar_post_feedback(uuid, text, uuid, text) to authenticated;

grant execute on function registrar_post_feedback(uuid, text, uuid, text) to service_role;

create function get_active_trends(p_limit integer DEFAULT 10, p_region text DEFAULT NULL::text)
    returns TABLE(id uuid, topic_name text, category text, region text, volume_score integer, expires_at timestamp with time zone)
    security definer
    language plpgsql
as
$$
BEGIN
    RETURN QUERY
    SELECT
        tt.id, tt.topic_name, tt.category, tt.region, tt.volume_score, tt.expires_at
    FROM public.trending_topics tt
    WHERE tt.expires_at > NOW()
      AND (p_region IS NULL OR tt.region = p_region)
    ORDER BY tt.volume_score DESC, tt.expires_at DESC
    LIMIT p_limit;
END;
$$;

alter function get_active_trends(integer, text) owner to postgres;

grant execute on function get_active_trends(integer, text) to anon;

grant execute on function get_active_trends(integer, text) to authenticated;

grant execute on function get_active_trends(integer, text) to service_role;

create function recompute_viral_scores(p_hours_window integer DEFAULT 72) returns integer
    security definer
    language plpgsql
as
$$
DECLARE
  v_updated INT := 0;
  v_post_id uuid;
BEGIN
  FOR v_post_id IN
    SELECT p.id FROM public.posts p
    WHERE p.is_banned = false
      AND p.created_at > NOW() - (p_hours_window || ' hours')::interval
  LOOP
    PERFORM public.calculate_viral_score(v_post_id);
    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

alter function recompute_viral_scores(integer) owner to postgres;

grant execute on function recompute_viral_scores(integer) to anon;

grant execute on function recompute_viral_scores(integer) to authenticated;

grant execute on function recompute_viral_scores(integer) to service_role;

create function combine_feed_and_viral(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_personal_weight double precision DEFAULT 0.75, p_user_id uuid DEFAULT NULL::uuid, p_viral_weight double precision DEFAULT 0.25, p_pool_size integer DEFAULT 150)
    returns TABLE(id uuid, content text, media jsonb, created_at timestamp with time zone, likes_count bigint, reposts_count bigint, replies_count bigint, user_id uuid, username text, display_name text, profile_picture_url text, is_verified boolean, rank_score double precision, viral_score double precision, combined_score double precision)
    security definer
    language plpgsql
as
$$
DECLARE
    v_auth_txt text := (SELECT auth.uid());
BEGIN
    IF p_user_id IS NULL THEN
        IF v_auth_txt IS NOT NULL AND v_auth_txt <> '' THEN
            p_user_id := v_auth_txt::uuid;
        END IF;
    END IF;

    RETURN QUERY
        WITH base_f AS (
            SELECT * FROM public.get_for_you_feed(p_pool_size, 0)
        ),
        candidates AS (
            SELECT f.* FROM base_f f
            WHERE (p_user_id IS NULL) OR f.user_id IS DISTINCT FROM p_user_id
        ),
        scored_posts AS (
            SELECT
                c.*,
                COALESCE(pvs.viral_score, 0) as v_score,
                COALESCE(u.is_verified, false) as is_verified
            FROM candidates c
            LEFT JOIN public.post_viral_scores pvs ON pvs.post_id = c.id
            LEFT JOIN public.users u ON u.id = c.user_id
        ),
        media_agg AS (
            SELECT mf.post_id,
                   jsonb_agg(jsonb_build_object('media_url', mf.image, 'post_id', mf.post_id)
                       ORDER BY mf.created_at DESC) AS media_aggr
            FROM public.media_feature mf
            GROUP BY mf.post_id
        ),
        with_media AS (
            SELECT s.*, media_agg.media_aggr AS media_from_agg
            FROM scored_posts s
            LEFT JOIN media_agg ON s.id = media_agg.post_id
        )
        SELECT
            w.id::uuid, w.content::text,
            COALESCE(w.media_from_agg, w.media, '[]'::jsonb) AS media,
            w.created_at::timestamptz, w.likes_count::bigint, w.reposts_count::bigint,
            w.replies_count::bigint, w.user_id::uuid, w.username::text, w.display_name::text,
            w.profile_picture_url::text, w.is_verified::boolean, w.rank_score::double precision,
            w.v_score::double precision as viral_score,
            (COALESCE(p_personal_weight, 0.75) * COALESCE(w.rank_score, 0) +
             COALESCE(p_viral_weight, 0.25) * (COALESCE(w.v_score, 0) * 20.0))::double precision as combined_score
        FROM with_media w
        ORDER BY combined_score DESC
        LIMIT p_limit OFFSET p_offset;
END;
$$;

alter function combine_feed_and_viral(integer, integer, double precision, uuid, double precision, integer) owner to postgres;

grant execute on function combine_feed_and_viral(integer, integer, double precision, uuid, double precision, integer) to anon;

grant execute on function combine_feed_and_viral(integer, integer, double precision, uuid, double precision, integer) to authenticated;

grant execute on function combine_feed_and_viral(integer, integer, double precision, uuid, double precision, integer) to service_role;


