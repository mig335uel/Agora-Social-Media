-- Función para obtener el feed "Para Ti" HÍBRIDO (Hotness + Intereses Personales)
CREATE OR REPLACE FUNCTION get_for_you_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
    id UUID,
    content TEXT,
    media_url TEXT,
    media_type VARCHAR,
    created_at TIMESTAMPTZ,
    likes_count INT,
    reposts_count INT,
    replies_count INT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    profile_picture_url TEXT,
    rank_score FLOAT
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.content, p.media_url, p.media_type, p.created_at, 
        p.likes_count, p.reposts_count, p.replies_count,
        u.id as user_id, u.username, u.display_name, u.profile_picture_url,
        -- LOGICA HÍBRIDA:
        (
            -- Parte 1: Hot Ranking (Global)
            ((p.likes_count * 2 + p.reposts_count * 3 + p.replies_count + 1)::FLOAT / 
            POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2, 1.5))
            
            * 
            
            -- Parte 2: Boost Personal (Basado en la función de intereses que me has pasado)
            -- Si el post tiene temas que te interesan, su score se multiplica
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
    ORDER BY rank_score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
