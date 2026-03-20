import { supabase } from "../lib/supbase/supabase";

/**
 * Servicio para gestionar la creación de publicaciones y temas relacionados.
 */
export async function createPost(content: string, mediaUrls: string[] = []) {
  try {
    // 1. Obtener el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    // 2. Insertar el post principal
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content,
        parent_post_id: null, // De momento no soportamos hilos
      })
      .select()
      .single();

    if (postError) throw postError;

    // 2.1 Insertar media si existe
    if (mediaUrls.length > 0) {
      const mediaInserts = mediaUrls.map(url => ({
        post_id: post.id,
        media_url: url
      }));

      const { error: mediaError } = await supabase
        .from('media_feature')
        .insert(mediaInserts);
      
      if (mediaError) {
        console.error("Error guardando media:", mediaError.message);
      }
    }

    // 3. Extraer hashtags del contenido HTML
    // Buscamos el patrón #texto dentro del contenido
    const hashtags = extractHashtags(content);
    
    // 4. Insertar hashtags en post_topics si existen
    if (hashtags.length > 0) {
      const topicInserts = hashtags.map(topic => ({
        post_id: post.id,
        topic: topic.toLowerCase()
      }));

      const { error: topicError } = await supabase
        .from('post_topics')
        .insert(topicInserts);

      if (topicError) {
        console.error("Error guardando hashtags:", topicError.message);
        // No lanzamos error para no fallar la publicación si solo fallan los hashtags
      }
    }

    return post;
  } catch (error) {
    console.error("Error en createPost:", error);
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

    return data.map(item => item.topic_name);
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
