import { supabase } from "../lib/supbase/supabase";
import { ProcessedImage, uploadPostImage } from "./ImageService";

/**
 * Servicio para gestionar la creación de publicaciones y temas relacionados.
 */
export async function createPost(content: string, localImages: ProcessedImage[] = [], parentPostId: string | null = null) {
  try {
    // 1. Obtener el usuario autenticado para saber quién publica
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    // 2. Insertar el post principal
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content,
        parent_post_id: parentPostId, // Ahora soportamos hilos
      })
      .select()
      .single();

    if (postError) throw postError;

    // 2.1 Si es una respuesta, incrementamos el conteo del padre
    if (parentPostId) {
      const { data: parentData } = await supabase
        .from('posts')
        .select('replies_count')
        .eq('id', parentPostId)
        .single();
      
      if (parentData) {
        await supabase
          .from('posts')
          .update({ replies_count: (parentData.replies_count || 0) + 1 })
          .eq('id', parentPostId);
      }
    }

    // 2.1 Subir imágenes y vincularlas (Flujo Diferido)
    // Subimos las fotos usando el post.id que acabamos de obtener
    if (localImages.length > 0) {
      const mediaUrls: string[] = [];

      // Iteramos sobre las imágenes locales guardadas en el componente
      for (const localImg of localImages) {
        // Subimos cada una a su carpeta correspondiente (UUID del post)
        const publicUrl = await uploadPostImage(post.id, localImg);
        if (publicUrl) {
          mediaUrls.push(publicUrl);
        }
      }

      // Si se subieron correctamente, las vinculamos en la tabla media_feature
      if (mediaUrls.length > 0) {
        const mediaInserts = mediaUrls.map(url => ({
          post_id: post.id,
          user_id: user.id,
          image: url
        }));

        const { error: mediaError } = await supabase
          .from('media_feature')
          .insert(mediaInserts);

        if (mediaError) {
          console.error("Error vinculando media en base de datos:", mediaError.message);
        }
      }
    }

    // 3. Extraer hashtags del contenido HTML
    // Buscamos el patrón #texto dentro del contenido
    const hashtags = extractHashtags(content);

    // 4. Registrar hashtags globalmente e insertar en post_topics
    if (hashtags.length > 0) {
      // 4.1 Registro Global (Asegurar que existen en el sistema de tendencias/búsqueda)
      for (const tag of hashtags) {
        const normalizedTag = tag.toLowerCase();

        // 4.1.1 Intentar registrar el Tópico Global (si no existe)
        // Usamos upsert sobre topic_name para que no explote si ya lo creó otro
        const { data: topicData, error: topicError } = await supabase
          .from('trending_topics')
          .upsert({
            topic_name: normalizedTag,
            category: 'General', // Por defecto
            region: 'Global',     // Por defecto
            volume_score: 1,      // Empezamos con al menos 1 post
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 días
          }, { onConflict: 'topic_name' })
          .select()
          .single();

        if (!topicError && topicData) {
          // 4.1.2 Registrar la relación en trending_hashtags para las sugerencias
          await supabase
            .from('trending_hashtags')
            .upsert({
              trend_id: topicData.id,
              hashtag: normalizedTag,
              is_custom: true,
              created_by: user.id
            }, { onConflict: 'hashtag' });
        }
      }

      // 4.2 Vincular el Post con cada Tópico en la tabla relacional
      const topicInserts = hashtags.map(topic => ({
        post_id: post.id,
        topic: topic.toLowerCase()
      }));

      const { error: relError } = await supabase
        .from('post_topics')
        .insert(topicInserts);

      if (relError) console.error("Error vinculando hashtags al post:", relError.message);
    }

    // 5. Extraer y guardar menciones
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      const mentionInserts = mentions.map(mention => ({
        post_id: post.id,
        user_id: user.id,
        mention: mention.toLowerCase()
      }));

      const { error: mentionError } = await supabase
        .from('post_mentions')
        .insert(mentionInserts);

      if (mentionError) {
        console.error("Error guardando menciones:", mentionError.message);
      }
    }

    return post;
  } catch (error) {
    console.error("Error en createPost:", error);
    throw error;
  }
}

/**
 * Elimina una publicación por su ID.
 */
export async function deletePost(postId: string) {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error eliminando post:", error);
    throw error;
  }
}

/**
 * Busca hashtags populares en la tabla trending_topics.
 */
export async function getTrendingTopics(query: string = ''): Promise<string[]> {
  try {
    let request = supabase
      .from('trending_topics')
      .select(`
        topic_name,
        trending_hashtags(hashtag)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('volume_score', { ascending: false })
      .limit(10);

    if (query) {
      request = request.or(
        `topic_name.ilike.%${query}%,trending_hashtags.hashtag.ilike.%${query}%`
      );
    }

    const { data, error } = await request;
    if (error) throw error;

    if (!data) return [];

    // Extraemos todos los hashtags únicos de los trending topics encontrados
    const hashtags: string[] = [];
    data.forEach(item => {
      const nested = (item as any).trending_hashtags;
      if (nested && Array.isArray(nested) && nested.length > 0) {
        nested.forEach((h: any) => hashtags.push(h.hashtag));
      } else {
        // Fallback: si no tiene hashtags vinculados, usamos el nombre del tópico sin espacios
        hashtags.push(item.topic_name.replace(/\s+/g, ''));
      }
    });

    return Array.from(new Set(hashtags));
  } catch (error) {
    console.error("Error obteniendo trending topics:", error);
    return [];
  }
}

/**
 * Extrae hashtags de una cadena de texto (incluyendo HTML).
 */
function extractHashtags(text: string): string[] {
  // Limpiamos etiquetas HTML para extraer hashtags del texto plano
  const plainText = text.replace(/<[^>]*>?/gm, ' ');
  const hashtagRegex = /#(\w+)/g;
  const matches = plainText.match(hashtagRegex);

  if (!matches) return [];

  // Eliminamos el símbolo # y quitamos duplicados
  return Array.from(new Set(matches.map(m => m.substring(1))));
}


function extractMentions(text: string): string[] {
  const plainText = text.replace(/<[^>]*>?/gm, ' ');
  const mentionRegex = /@(\w+)/g;
  const matches = plainText.match(mentionRegex);

  if (!matches) return [];

  // Eliminamos el símbolo @ y quitamos duplicados
  return Array.from(new Set(matches.map(m => m.substring(1))));
}

/**
 * Da o quita like a una publicación.
 */
export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  try {
    const { data, error } = await supabase.rpc('toggle_like', { p_post_id: postId });
    if (error) throw error;
    return { liked: data.liked };
  } catch (error) {
    console.error("Error en toggleLike:", error);
    throw error;
  }
}

/**
 * Repostea o quita el repost de una publicación.
 */
export async function repostPost(postId: string): Promise<{ reposted: boolean }> {
  try {
    const { data, error } = await supabase.rpc('toggle_repost', { p_post_id: postId });
    if (error) throw error;
    return { reposted: data.reposted };
  } catch (error) {
    console.error("Error en repostPost:", error);
    throw error;
  }
}

/**
 * Registra que se ha compartido una publicación.
 */
export async function recordShare(postId: string) {
  try {
    const { error } = await supabase.rpc('record_post_share', { p_post_id: postId });
    if (error) throw error;
  } catch (error) {
    console.error("Error en recordShare:", error);
  }
}
