import { supabase } from "../lib/supbase/supabase";
import { media_feature } from "@/Types/Posts";

export interface RankedPost {
  id: string;
  content: string;
  media?: media_feature[];
  created_at: string;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  shares_count: number;
  user_id: string;
  username: string;
  display_name: string;
  profile_picture_url: string | null;
  rank_score: number;
  viral_score: number;
  combined_score: number;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_replied?: boolean;
  user?: any; 
}

/**
 * Obtiene el feed "Para Ti" utilizando el nuevo algoritmo que combina 
 * relevancia personal y viralidad global.
 */
export async function getForYouFeed(limit: number = 20, offset: number = 0): Promise<RankedPost[]> {
  try {
    // Obtenemos el usuario actual para la personalización del feed
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Obtener posts algorítmicos desde RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('combine_feed_and_viral', {
      p_user_id: user?.id || null,
      p_limit: limit,
      p_offset: offset,
      p_personal_weight: 0.75,
      p_viral_weight: 0.25
    });

    if (rpcError) { console.error('Error RPC:', rpcError); throw rpcError; }
    const rows = (rpcData || []) as any[];

    // 2. Fetch all unique users for these posts in one batch
    const uniqueUserIds = [...new Set(rows.map(r => String(r.user_id)))];
    const { data: feedUsers } = await supabase
      .from('users')
      .select('*')
      .in('id', uniqueUserIds);

    const userMap = new Map((feedUsers || []).map(u => [String(u.id), u]));

    const mapped: RankedPost[] = rows.map((r) => {
      const postUser = userMap.get(String(r.user_id));
      return {
        id: String(r.id),
        content: r.content ?? '',
        media: Array.isArray(r.media)
          ? r.media.map((m: any) => ({
            image: m.media_url || m.image || null,
            post_id: String(m.post_id),
            user_id: String(r.user_id),
            created_at: String(r.created_at)
          }))
          : undefined,
        created_at: String(r.created_at),
        likes_count: Number(r.likes_count ?? 0),
        reposts_count: Number(r.reposts_count ?? 0),
        replies_count: Number(r.replies_count ?? 0),
        shares_count: Number(r.shares_count ?? 0),
        user_id: String(r.user_id),
        user: postUser,
        username: postUser?.username || r.username || '',
        display_name: postUser?.display_name || r.display_name || '',
        profile_picture_url: postUser?.profile_picture_url || r.profile_picture_url || null,
        rank_score: Number(r.rank_score ?? 0),
        viral_score: Number(r.viral_score ?? 0),
        combined_score: Number(r.combined_score ?? 0),
      };
    });

    // 2. Obtener posts recientes del propio usuario directamente
    const { data: userData, error: userError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (userError) { console.error('Error User Posts:', userError); }

    let finalFeed = [...mapped];

    if (userData && userData.length > 0) {
      // Necesitamos el perfil del usuario actual para los campos display_name, etc.
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Fetch media for user posts
      const userPostIds = userData.map(p => String(p.id));
      const { data: userMedia } = await supabase
        .from('media_feature')
        .select('*')
        .in('post_id', userPostIds);

      const userPosts: RankedPost[] = userData.map(p => {
        const postMedia = (userMedia || [])
          .filter(m => String(m.post_id) === String(p.id))
          .map(m => ({
            image: m.image || m.media_url || null,
            post_id: String(m.post_id),
            user_id: String(p.user_id),
            created_at: String(m.created_at || p.created_at)
          }));

        return {
          id: String(p.id),
          content: p.content || '',
          media: postMedia as any,
          created_at: String(p.created_at),
          likes_count: Number(p.likes_count || 0),
          reposts_count: Number(p.reposts_count || 0),
          replies_count: Number(p.replies_count || 0),
          shares_count: Number(p.shares_count || 0),
          user_id: String(p.user_id),
          username: profile?.username || '',
          user: profile,
          display_name: profile?.display_name || '',
          profile_picture_url: profile?.profile_picture_url || null,
          rank_score: 1.0,
          viral_score: 0,
          combined_score: 1.0
        };
      });

      // Combinar y eliminar duplicados por ID
      const combined = [...userPosts, ...mapped];
      const uniqueIds = new Set();
      finalFeed = combined.filter(post => {
        if (uniqueIds.has(post.id)) return false;
        uniqueIds.add(post.id);
        return true;
      });

      // Ordenar por fecha descending (más reciente primero)
      finalFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // 3. Obtener interacciones del usuario para estos posts (Likes, Reposts, Replies)
    if (user && finalFeed.length > 0) {
      const postIds = finalFeed.map(p => p.id);

      const [likesRes, repostsRes, repliesRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('posts').select('parent_post_id').eq('user_id', user.id).in('parent_post_id', postIds)
      ]);

      const likedIds = new Set(likesRes.data?.map(l => l.post_id));
      const repostedIds = new Set(repostsRes.data?.map(r => r.post_id));
      const repliedIds = new Set(repliesRes.data?.map(r => r.parent_post_id));

      finalFeed = finalFeed.map(p => ({
        ...p,
        is_liked: likedIds.has(p.id),
        is_reposted: repostedIds.has(p.id),
        is_replied: repliedIds.has(p.id)
      }));
    }

    return finalFeed;

  } catch (error) {
    console.error("Error al obtener el feed algorithmic (viral):", error);
    return [];
  }
}
