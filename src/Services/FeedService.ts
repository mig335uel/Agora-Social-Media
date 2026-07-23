import { supabase } from "../lib/supbase/supabase";
import { media_feature } from "@/Types/Posts";
import { getBlockedUserIds } from "./UserService";
// @ts-ignore 
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mapea una fila del RPC combine_feed_and_viral a RankedPost.
 *  No necesita fetch extra de users: el RPC ya incluye username/display_name/profile_picture_url. */
function mapRpcRow(r: any): RankedPost {
  return {
    id: String(r.id),
    content: r.content ?? '',
    media: Array.isArray(r.media)
      ? r.media.map((m: any) => ({
          image: m.media_url || m.image || null,
          post_id: String(m.post_id),
          user_id: String(r.user_id),
          created_at: String(r.created_at),
        }))
      : undefined,
    created_at: String(r.created_at),
    likes_count: Number(r.likes_count ?? 0),
    reposts_count: Number(r.reposts_count ?? 0),
    replies_count: Number(r.replies_count ?? 0),
    shares_count: Number(r.shares_count ?? 0),
    user_id: String(r.user_id),
    username: r.username || '',
    display_name: r.display_name || '',
    profile_picture_url: r.profile_picture_url || null,
    // Construimos el objeto user directamente con los datos del RPC
    user: {
      id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      profile_picture_url: r.profile_picture_url,
      is_verified: r.is_verified || false,  // ← añade esto
    },
    rank_score: Number(r.rank_score ?? 0),
    viral_score: Number(r.viral_score ?? 0),
    combined_score: Number(r.combined_score ?? 0),
  };
}

/** Añade is_liked / is_reposted / is_replied a un array de posts en una sola tanda de 3 queries. */
async function attachInteractions(posts: RankedPost[], userId: string): Promise<RankedPost[]> {
  if (posts.length === 0) return posts;
  const postIds = posts.map(p => p.id);

  const [likesRes, repostsRes, repliesRes] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('reposts').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('posts').select('parent_post_id').eq('user_id', userId).in('parent_post_id', postIds),
  ]);

  const likedIds    = new Set(likesRes.data?.map(l => l.post_id));
  const repostedIds = new Set(repostsRes.data?.map(r => r.post_id));
  const repliedIds  = new Set(repliesRes.data?.map(r => r.parent_post_id));

  return posts.map(p => ({
    ...p,
    is_liked:    likedIds.has(p.id),
    is_reposted: repostedIds.has(p.id),
    is_replied:  repliedIds.has(p.id),
  }));
}

// ─── getForYouFeed ────────────────────────────────────────────────────────────

/**
 * Feed "Para Ti": mezcla relevancia personal y viralidad global.
 *
 * Optimizaciones respecto a la versión anterior:
 *  • El RPC ya devuelve username/display_name/profile_picture_url → se elimina
 *    el fetch extra de la tabla users (ahorramos 1 round-trip).
 *  • El RPC y los posts propios del usuario se lanzan en paralelo.
 *  • Los posts propios y el perfil+media también van en paralelo.
 */
export async function getForYouFeed(limit = 20, offset = 0): Promise<RankedPost[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Lanzamos en paralelo: feed algorítmico + posts propios recientes + lista de bloqueados
    const [rpcResult, ownPostsResult, blockedIds] = await Promise.all([
      supabase.rpc('combine_feed_and_viral', {
        p_user_id: user?.id ?? null,
        p_limit: limit,
        p_offset: offset,
        p_personal_weight: 0.75,
        p_viral_weight: 0.25,
      }),
      user
        ? supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .is('parent_post_id', null)
            .order('created_at', { ascending: false })
            .limit(3)
        : Promise.resolve({ data: null, error: null }),
      user ? getBlockedUserIds(user.id) : Promise.resolve([]),
    ]);

    const { data: rpcData, error: rpcError } = rpcResult;
    if (rpcError) throw rpcError;

    const blockedSet = new Set(blockedIds as string[]);

    // Filtrar posts de usuarios bloqueados
    const mapped = ((rpcData as any[]) ?? [])
      .filter(r => !blockedSet.has(String(r.user_id)))
      .map(mapRpcRow);

    // 2. Posts propios: se unen al feed con prioridad (sin duplicar los que ya trae el RPC)
    const { data: ownPosts } = ownPostsResult as any;
    let finalFeed = mapped;

    if (user && ownPosts?.length > 0) {
      const ownPostIds = (ownPosts as any[]).map(p => String(p.id));

      // Perfil + media del usuario propio → en paralelo
      const [profileRes, mediaRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, display_name, profile_picture_url, is_verified')
          .eq('id', user.id)
          .single(),
        supabase.from('media_feature').select('*').in('post_id', ownPostIds),
      ]);

      const profile  = profileRes.data;
      const allMedia = mediaRes.data ?? [];

      const ownMapped: RankedPost[] = (ownPosts as any[]).map(p => {
        const postMedia = allMedia
          .filter(m => String(m.post_id) === String(p.id))
          .map(m => ({
            image: m.image || null,
            post_id: String(m.post_id),
            user_id: String(p.user_id),
            created_at: String(m.created_at || p.created_at),
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
          display_name: profile?.display_name || '',
          profile_picture_url: profile?.profile_picture_url || null,
          user: profile,
          rank_score: 1.0,
          viral_score: 0,
          combined_score: 1.0,
        };
      });

      // Eliminar duplicados (el RPC puede incluir posts propios si p_user_id era null)
      const rpcIds = new Set(mapped.map(p => p.id));
      const onlyNew = ownMapped.filter(p => !rpcIds.has(p.id));

      finalFeed = [...onlyNew, ...mapped];
      finalFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // 3. Interacciones (likes / reposts / replies)
    if (user) finalFeed = await attachInteractions(finalFeed, user.id);

    return finalFeed;
  } catch (error) {
    console.error('Error en getForYouFeed:', error);
    return [];
  }
}

// ─── getUserPosts ─────────────────────────────────────────────────────────────

/**
 * Posts de un usuario concreto (vista de perfil).
 */
export async function getUserPosts(
  targetUserId: string,
  limit = 20,
  offset = 0,
): Promise<RankedPost[]> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) throw postsError;
    if (!postsData?.length) return [];

    const postIds = postsData.map(p => String(p.id));

    // Media + perfil en paralelo; interacciones solo si hay sesión
    const parallelQueries: PromiseLike<any>[] = [
      supabase.from('media_feature').select('*').in('post_id', postIds),
      supabase.from('users').select('*').eq('id', targetUserId).single(),
    ];

    if (currentUser) {
      parallelQueries.push(
        supabase.from('likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
        supabase.from('reposts').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
        supabase.from('posts').select('parent_post_id').eq('user_id', currentUser.id).in('parent_post_id', postIds),
      );
    }

    const [mediaRes, profileRes, likesRes, repostsRes, repliesRes] = await Promise.all(parallelQueries);

    const profile    = profileRes.data;
    const allMedia   = mediaRes.data ?? [];
    const likedIds   = new Set(likesRes?.data?.map((l: any) => l.post_id));
    const repostedIds = new Set(repostsRes?.data?.map((r: any) => r.post_id));
    const repliedIds  = new Set(repliesRes?.data?.map((r: any) => r.parent_post_id));

    return postsData.map(p => {
      const postMedia = allMedia
        .filter((m: any) => String(m.post_id) === String(p.id))
        .map((m: any) => ({
          image: m.image || null,
          post_id: String(m.post_id),
          user_id: String(p.user_id),
          created_at: String(m.created_at || p.created_at),
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
        display_name: profile?.display_name || '',
        profile_picture_url: profile?.profile_picture_url || null,
        user: profile,
        rank_score: 1.0,
        viral_score: 0,
        combined_score: 1.0,
        is_liked:    likedIds.has(p.id),
        is_reposted: repostedIds.has(p.id),
        is_replied:  repliedIds.has(p.id),
      };
    });
  } catch (error) {
    console.error('Error en getUserPosts:', error);
    return [];
  }
}

// ─── getFollowsFeed ───────────────────────────────────────────────────────────

/**
 * Feed de seguidos.
 *
 * Fix: la relación de media era `!id` (FK incorrecta) → ahora `!post_id`.
 */
export async function getFollowsFeed(limit = 20, offset = 0): Promise<RankedPost[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. IDs de seguidos + lista de bloqueados en paralelo
    const [followsResult, blockedIds] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      getBlockedUserIds(user.id),
    ]);

    const { data: follows, error: followsError } = followsResult;
    if (followsError) throw followsError;

    const blockedSet = new Set(blockedIds);
    const followingIds = follows
      .map(f => f.following_id)
      .filter(id => !blockedSet.has(id)); // excluir bloqueados

    if (followingIds.length === 0) return [];

    // 2. Posts con user y media (FK correcta: post_id)
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(*),
        media:media_feature!post_id(*)
      `)
      .in('user_id', followingIds)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) throw postsError;
    if (!postsData?.length) return [];

    // 3. Mapear e incluir interacciones
    const base: RankedPost[] = postsData.map(p => ({
      id: String(p.id),
      content: p.content || '',
      media: p.media as any,
      created_at: String(p.created_at),
      likes_count: Number(p.likes_count || 0),
      reposts_count: Number(p.reposts_count || 0),
      replies_count: Number(p.replies_count || 0),
      shares_count: Number(p.shares_count || 0),
      user_id: String(p.user_id),
      username: p.user?.username || '',
      display_name: p.user?.display_name || '',
      profile_picture_url: p.user?.profile_picture_url || null,
      user: p.user,
      rank_score: 1.0,
      viral_score: 0,
      combined_score: 1.0,
    }));

    return await attachInteractions(base, user.id);
  } catch (error) {
    console.error('Error en getFollowsFeed:', error);
    return [];
  }
}

// ─── getActiveTrends ─────────────────────────────────────────────────────────

/**
 * Obtiene la lista de tendencias activas para la pantalla de búsqueda/exploración.
 */
export async function getActiveTrends(limit = 10, region = 'Tendencia en España') {
  try {
    const { data, error } = await supabase.rpc('get_active_trends', {
      p_limit: limit,
      p_region: region,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener tendencias activas:', error);
    return [];
  }
}
