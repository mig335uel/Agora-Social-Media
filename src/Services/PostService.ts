import { supabase } from "../lib/supbase/supabase";

/**
 * Servicio para gestionar la creación de publicaciones y temas relacionados.
 */
export async function createPost(content: string, mediaUrl: string | null = null, mediaType: string = 'image') {
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
        media_url: mediaUrl,
        media_type: mediaType,
        parent_post_id: null, // De momento no soportamos hilos
      })
      .select()
      .single();

    if (postError) throw postError;

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
      .select('topic_name')
      .order('volume_score', { ascending: false })
      .limit(10);

    if (query) {
      request = request.ilike('topic_name', `%${query}%`);
    }

    const { data, error } = await request;
    if (error) throw error;

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
