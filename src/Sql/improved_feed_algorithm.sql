-- ============================================================================
-- ALGORITMO MEJORADO DE RECOMENDACIÓN Y TENDENCIAS - AGORA SOCIAL MEDIA
-- Archivo: src/Sql/improved_feed_algorithm.sql
-- ============================================================================

-- 1. Helper RLS Auto Enable (para garantizar seguridad en tablas nuevas)
CREATE OR REPLACE FUNCTION rls_auto_enable() RETURNS event_trigger
    SECURITY DEFINER
    SET search_path = pg_catalog
    LANGUAGE plpgsql
AS $$
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


-- 2. Registro de Retención por Lote (Dwell Time + Aprendizaje Logarítmico)
CREATE OR REPLACE FUNCTION registrar_retencion_lote(payload jsonb) RETURNS void
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
BEGIN
  -- PASO 1: Guardar la permanencia visual del usuario (Dwell Time en segundos)
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
  -- Filtro de atención: Solo aprende si el usuario permaneció al menos 2 segundos en el post.
  -- Puntuación acotada: Máximo 5 puntos por sesión de visualización para evitar sesgos extremos.
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

END;
$$;

GRANT EXECUTE ON FUNCTION registrar_retencion_lote(jsonb) TO authenticated, service_role;


-- 3. Upsert Inteligente de Tendencias (con Renovación de Expiración)
CREATE OR REPLACE FUNCTION upsert_trend(trends jsonb) RETURNS void
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
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
    -- Al recibir una nueva mención, renueva la fecha de expiración si estaba próxima a caducar
    expires_at = GREATEST(trending_topics.expires_at, NOW() + INTERVAL '24 hours');
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_trend(jsonb) TO authenticated, service_role;


-- 4. RPC para Obtener Tendencias Activas (para la pestaña Buscar / Explorar)
CREATE OR REPLACE FUNCTION get_active_trends(
    p_limit INT DEFAULT 10,
    p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    topic_name TEXT,
    category TEXT,
    region TEXT,
    volume_score INT,
    expires_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id,
        tt.topic_name,
        tt.category,
        tt.region,
        tt.volume_score,
        tt.expires_at
    FROM public.trending_topics tt
    WHERE tt.expires_at > NOW() -- Filtro estricto: Solo tendencias vigentes
      AND (p_region IS NULL OR tt.region = p_region)
    ORDER BY tt.volume_score DESC, tt.expires_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_trends(INT, TEXT) TO anon, authenticated, service_role;


-- 5. Cálculo Optimizado del Viral Score (Gravedad + Tendencias Vigentes)
CREATE OR REPLACE FUNCTION viral_score(p_post_id uuid) RETURNS double precision
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
DECLARE
  v_likes integer := 0;
  v_reposts integer := 0;
  v_replies integer := 0;
  v_shares integer := 0;
  v_impressions integer := 0;
  v_age_hours double precision := 0.1;
  v_trend_score double precision := 0;
  v_raw_score double precision := 0;
  v_norm_score double precision := 0;
BEGIN
  -- Obtener métricas del post
  SELECT 
    COALESCE(likes_count, 0), 
    COALESCE(reposts_count, 0), 
    COALESCE(replies_count, 0), 
    COALESCE(shares_count, 0), 
    COALESCE(impressions_count, 0), 
    GREATEST(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 0.1)
  INTO v_likes, v_reposts, v_replies, v_shares, v_impressions, v_age_hours
  FROM public.posts 
  WHERE id = p_post_id;

  -- Extraer la puntuación de la tendencia ACTIVA más fuerte asociada al post
  SELECT COALESCE(volume_score, 0) 
  INTO v_trend_score 
  FROM public.trending_topics 
  WHERE topic_name IN (
    SELECT topic FROM public.post_topics WHERE post_id = p_post_id
  )
  AND expires_at > NOW() -- Solo tendencias activas
  ORDER BY volume_score DESC 
  LIMIT 1;

  -- Señal viral cruda con decaimiento temporal por gravedad (Gravedad 1.25)
  v_raw_score := (
      (v_likes * 1.0) + 
      (v_reposts * 2.0) + 
      (v_replies * 1.5) + 
      (v_shares * 2.5) + 
      (v_impressions * 0.05)
  ) / POWER(v_age_hours + 2.0, 1.25);

  -- Incorporar boost por tendencia activa (Máximo 3x de bonificación)
  IF v_trend_score > 0 THEN
      v_raw_score := v_raw_score * (1.0 + LEAST(v_trend_score / 50.0, 3.0));
  END IF;

  -- Normalización sigmoidal en rango 0..1
  v_norm_score := v_raw_score / (v_raw_score + 8.0);

  RETURN LEAST(GREATEST(v_norm_score, 0.0), 1.0);
END;
$$;

GRANT EXECUTE ON FUNCTION viral_score(uuid) TO anon, authenticated, service_role;


-- 6. RPC "Para Ti" Híbrido con Escalado Logarítmico de Intereses
CREATE OR REPLACE FUNCTION get_for_you_feed(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
    RETURNS TABLE(
        id uuid, 
        content text, 
        media jsonb, 
        created_at timestamp with time zone, 
        likes_count integer, 
        reposts_count integer, 
        replies_count integer, 
        user_id uuid, 
        username text, 
        display_name text, 
        profile_picture_url text, 
        rank_score double precision
    )
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
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
                -- Puntuación base de relevancia reciente (Hotness)
                ((p.likes_count * 2 + p.reposts_count * 3 + p.replies_count * 2 + p.shares_count * 3 + 1)::FLOAT / 
                POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2.0, 1.4))
                * 
                -- Escalado logarítmico de afinidad personal para suavizar picos
                COALESCE((
                    SELECT 1.0 + (LN(1.0 + SUM(ui.interest_score)) / 5.0)
                    FROM public.post_topics pt
                    JOIN public.user_interests ui ON pt.topic = ui.category
                    WHERE pt.post_id = p.id AND ui.user_id = v_user_id
                ), 1.0)
            ) as rank_score
        FROM public.posts p
        JOIN public.users u ON p.user_id = u.id
        WHERE p.parent_post_id IS NULL
    ),
    social_boosts AS (
        SELECT 
            bp.*,
            (
                bp.rank_score 
                *
                -- Multiplicador Social Directo: x10 si sigo al creador del post
                COALESCE((
                    SELECT 10.0 FROM public.follows f 
                    WHERE f.follower_id = v_user_id AND f.following_id = bp.user_id
                    LIMIT 1
                ), 1.0)
                *
                -- Multiplicador Colaborativo: x3 si un amigo le ha dado Like al post
                COALESCE((
                    SELECT 3.0 FROM public.likes l
                    JOIN public.follows f ON f.following_id = l.user_id
                    WHERE f.follower_id = v_user_id AND l.post_id = bp.id
                    LIMIT 1
                ), 1.0)
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
        sb.id,
        sb.content,
        COALESCE(ma.media, '[]'::jsonb) AS media,
        sb.created_at,
        sb.likes_count,
        sb.reposts_count,
        sb.replies_count,
        sb.user_id,
        sb.username,
        sb.display_name,
        sb.profile_picture_url,
        sb.boosted_rank_score AS rank_score
    FROM social_boosts sb
    LEFT JOIN media_agg ma ON sb.id = ma.post_id
    ORDER BY sb.boosted_rank_score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_for_you_feed(integer, integer) TO anon, authenticated, service_role;


-- 7. Función Principal Combinada (Personal + Virales + Exclusión de Bloqueados)
CREATE OR REPLACE FUNCTION combine_feed_and_viral(
    p_limit integer DEFAULT 20, 
    p_offset integer DEFAULT 0, 
    p_personal_weight double precision DEFAULT 0.75, 
    p_user_id uuid DEFAULT NULL::uuid, 
    p_viral_weight double precision DEFAULT 0.25
)
RETURNS TABLE(
    id uuid, 
    content text, 
    media jsonb, 
    created_at timestamp with time zone, 
    likes_count bigint, 
    reposts_count bigint, 
    replies_count bigint, 
    user_id uuid, 
    username text, 
    display_name text, 
    profile_picture_url text, 
    is_verified boolean, 
    rank_score double precision, 
    viral_score double precision, 
    combined_score double precision
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
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
            SELECT * FROM public.get_for_you_feed(500, 0)
        ),
        candidates AS (
            SELECT f.*
            FROM base_f f
            -- Excluir posts del propio usuario si se desea diversidad
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
                   jsonb_agg(
                       jsonb_build_object(
                           'media_url', mf.image, 
                           'post_id', mf.post_id
                       ) ORDER BY mf.created_at DESC
                   ) AS media_aggr
            FROM public.media_feature mf
            GROUP BY mf.post_id
        ),
        with_media AS (
            SELECT
                s.*,
                media_agg.media_aggr AS media_from_agg,
                COALESCE(u.is_verified, false) as is_verified
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
             COALESCE(p_viral_weight, 0.25) * (COALESCE(w.v_score, 0) * 20.0))::double precision as combined_score
        FROM with_media w
        ORDER BY combined_score DESC
        LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION combine_feed_and_viral(integer, integer, double precision, uuid, double precision) TO anon, authenticated, service_role;
