import { supabase } from "../lib/supbase/supabase";
import { ProcessedImage, uploadPostImage } from "./ImageService";
import { Platform } from "react-native";

interface Notifications {
  username: string;
  title: string;
  body: string;
  post_id: string;
  user_id?: string;
}

/**
 * Servicio para gestionar la creación de publicaciones y temas relacionados.
 */
export async function createPost(content: string, localImages: ProcessedImage[] = [], parentPostId: string | null = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content,
        parent_post_id: parentPostId,
      })
      .select()
      .single();

    if (postError) throw postError;

    // Incrementar hilos si aplica
    if (parentPostId) {
      const { data: parentData } = await supabase
        .from('posts')
        .select('replies_count, user_id')
        .eq('id', parentPostId)
        .single();

      if (parentData) {
        await supabase
          .from('posts')
          .update({ replies_count: (parentData.replies_count || 0) + 1 })
          .eq('id', parentPostId);

        if (parentData.user_id && parentData.user_id !== user.id) {
          const { data: senderData } = await supabase.from('users').select('username').eq('id', user.id).single();
          const payload: Notifications = {
            username: senderData?.username || "Alguien",
            title: "¡Nuevo Comentario! 💬",
            body: `${senderData?.username || "Alguien"} ha comentado tu publicación`,
            post_id: parentPostId,
            user_id: user.id,
          };
          fetch("https://api.periodiconaranja.es/agoras/notificacion/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-platform": Platform.OS },
            body: JSON.stringify(payload)
          }).catch(() => null);
        }
      }
    }

    // Subir imágenes
    // Subir imágenes
    if (localImages.length > 0) {
      console.log(`Subiendo ${localImages.length} imágenes...`);
      
      // 1. Subir las imágenes en paralelo para mayor velocidad
      const uploadPromises = localImages.map(localImg => uploadPostImage(post.id, localImg));
      const results = await Promise.all(uploadPromises);
      
      // 2. Filtrar las URLs válidas (ignorando las que hayan fallado y devuelto null)
      const mediaUrls = results.filter(url => url !== null) as string[];

      if (mediaUrls.length > 0) {
        // PRECAUCIÓN: Asegúrate de que tu columna en Supabase se llame exactamente 'image'
        // A veces se suele llamar 'media_url'. Si es así, cámbialo aquí abajo.
        const mediaInserts = mediaUrls.map(url => ({
          post_id: post.id,
          user_id: user.id,
          image: url 
        }));

        console.log("Insertando en media_feature:", mediaInserts);

        // 3. ¡IMPORTANTE! Capturar el error del insert
        const { error: mediaError } = await supabase.from('media_feature').insert(mediaInserts);
        
        if (mediaError) {
          console.error("❌ Error al vincular las imágenes con el post en la tabla media_feature:", mediaError);
          throw mediaError; // Hacemos que la función falle y el usuario sepa que algo fue mal
        } else {
          console.log("✅ Imágenes insertadas correctamente en la base de datos.");
        }
      }
    }

    // Hashtags
    const hashtags = extractHashtags(content);
    if (hashtags.length > 0) {
      const trendPayload = hashtags.map(tag => ({
        topic_name: tag.toLowerCase(),
        category: 'General',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }));

      // Registrar tendencias mediante la RPC centralizada
      await supabase.rpc('upsert_trend', { trends: trendPayload });

      const topicInserts = hashtags.map(topic => ({ post_id: post.id, topic: topic.toLowerCase() }));
      await supabase.from('post_topics').insert(topicInserts);
    }

    // Menciones
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      const mentionInserts = mentions.map(mention => ({
        post_id: post.id,
        user_id: user.id,
      }));
      await supabase.from('post_mentions').insert(mentionInserts);

      // Señal al servidor (El servidor maneja los dispositivos)
      const { data: senderData } = await supabase.from('users').select('username').eq('id', user.id).single();
      if (senderData) {
        const payload: Notifications = {
          username: senderData.username,
          title: "Te han mencionado",
          body: `${senderData.username} te ha mencionado en un post`,
          post_id: post.id,
          user_id: user.id, // El servidor busca a quién notificar basándose en 'mentions'
        };
        fetch("https://api.periodiconaranja.es/agoras/notificacion/like", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-platform": Platform.OS },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }
    }

    return post;
  } catch (error) {
    console.error("Error en createPost:", error);
    throw error;
  }
}

export async function deletePost(postId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    // Eliminar relaciones secundarias para evitar bloqueos por clave foránea (FK)
    await supabase.from('media_feature').delete().eq('post_id', postId);
    await supabase.from('post_topics').delete().eq('post_id', postId);
    await supabase.from('likes').delete().eq('post_id', postId);
    await supabase.from('reposts').delete().eq('post_id', postId);
    await supabase.from('user_interactions').delete().eq('post_id', postId);

    const { data: postData } = await supabase.from('posts').select('parent_post_id').eq('id', postId).single();
    if (postData?.parent_post_id) {
      await supabase
        .from('notifications')
        .delete()
        .eq('post_id', postData.parent_post_id)
        .eq('user_id', user.id);
    }

    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    if (error) {
      console.error("Error al borrar el post:", error.message);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error eliminando post:", error);
    throw error;
  }
}

export async function getTrendingTopics(query: string = ''): Promise<string[]> {
  try {
    let request = supabase.from('trending_topics').select('topic_name, trending_hashtags(hashtag)').gt('expires_at', new Date().toISOString()).order('volume_score', { ascending: false }).limit(10);
    if (query) request = request.or(`topic_name.ilike.%${query}%,trending_hashtags.hashtag.ilike.%${query}%`);
    const { data } = await request;
    if (!data) return [];
    const hashtags: string[] = [];
    data.forEach(item => {
      const nested = (item as any).trending_hashtags;
      if (nested && Array.isArray(nested) && nested.length > 0) {
        nested.forEach((h: any) => hashtags.push(h.hashtag));
      } else {
        hashtags.push(item.topic_name.replace(/\s+/g, ''));
      }
    });
    return Array.from(new Set(hashtags));
  } catch (error) {
    console.error("Error en getTrendingTopics:", error);
    return [];
  }
}

function extractHashtags(text: string): string[] {
  const plainText = text.replace(/<[^>]*>?/gm, ' ');
  const hashtagRegex = /#(\w+)/g;
  const matches = plainText.match(hashtagRegex);
  return matches ? Array.from(new Set(matches.map(m => m.substring(1)))) : [];
}

function extractMentions(text: string): string[] {
  const plainText = text.replace(/<[^>]*>?/gm, ' ');
  const mentionRegex = /@(\w+)/g;
  const matches = plainText.match(mentionRegex);
  return matches ? Array.from(new Set(matches.map(m => m.substring(1)))) : [];
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("No hay sesión activa");

    const { data, error } = await supabase.rpc('toggle_like', { p_post_id: postId });
    if (error) throw error;

    if (data.liked) {
      // Señal minimalista al servidor: El servidor buscará al autor y sus dispositivos
      const [{ data: postData }, { data: senderData }] = await Promise.all([
        supabase.from('posts').select('user_id').eq('id', postId).single(),
        supabase.from('users').select('username').eq('id', currentUser.id).single()
      ]);

      if (postData && postData.user_id !== currentUser.id) {
        const payload: Notifications = {
          username: senderData?.username || "Alguien",
          title: "¡Nuevo Like! ❤️",
          body: `${senderData?.username || "Alguien"} le dio like a tu publicación`,
          post_id: postId,
          user_id: currentUser.id,
        };
        console.log(payload);
        fetch("https://api.periodiconaranja.es/agoras/notificacion/like", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-platform": Platform.OS },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }
    } else {
      // Si retiró el like, borramos la notificación correspondiente
      await supabase
        .from('notifications')
        .delete()
        .eq('post_id', postId)
        .eq('sender_id', currentUser.id)
        .eq('type', 'like');
    }

    return { liked: data.liked };
  } catch (error) {
    console.error("Error en toggleLike:", error);
    throw error;
  }
}

export async function repostPost(postId: string): Promise<{ reposted: boolean }> {
  try {
    const { data, error } = await supabase.rpc('toggle_repost', { p_post_id: postId });
    if (error) throw error; // ← comprobamos el error ANTES de usar data
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (data.reposted && currentUser) {
      const { data: postData } = await supabase.from('posts').select('user_id').eq('id', postId).single();
      const { data: senderData } = await supabase.from('users').select('username').eq('id', currentUser.id).single();
      if (postData && postData.user_id !== currentUser.id) {
        const payload: Notifications = {
          username: senderData?.username || "Alguien",
          title: "¡Nuevo Repost! 🔄",
          body: `${senderData?.username || "Alguien"} ha compartido tu publicación`,
          post_id: postId,
          user_id: currentUser.id,
        };
        fetch("https://api.periodiconaranja.es/agoras/notificacion/repost", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-platform": Platform.OS },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }
    } else if (!data.reposted && currentUser) {
      await supabase
        .from('notifications')
        .delete()
        .eq('post_id', postId)
        .eq('sender_id', currentUser.id)
        .eq('type', 'repost');
    }
    
    return { reposted: data.reposted };
  } catch (error) {
    console.error("Error en repostPost:", error);
    throw error;
  }
}

export async function recordShare(postId: string) {
  try {
    await supabase.rpc('record_post_share', { p_post_id: postId });
    
  } catch (error) {
    console.error("Error en recordShare:", error);
  }
}



