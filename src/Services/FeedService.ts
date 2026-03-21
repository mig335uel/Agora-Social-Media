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
}

/**
 * Obtiene el feed "Para Ti" utilizando el nuevo algoritmo que combina 
 * relevancia personal y viralidad global.
 */
export async function getForYouFeed(limit: number = 20, offset: number = 0): Promise<RankedPost[]> {
  try {
    // Obtenemos el usuario actual para la personalización del feed
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('combine_feed_and_viral', {
      p_user_id: user?.id || null,
      p_limit: limit,
      p_offset: offset,
      p_personal_weight: 0.75,
      p_viral_weight: 0.25
    });

    // dentro de getForYouFeed, tras recibir data
    if (error) { console.log(error); throw error; }

    const rows = (data || []) as any[];

    const mapped: RankedPost[] = rows.map((r) => ({
      id: String(r.id),
      content: r.content ?? '',
      media: Array.isArray(r.media)
        ? r.media.map((m: any) => ({ media_url: m.media_url ?? null, post_id: String(m.post_id) }))
        : undefined,
      created_at: String(r.created_at),
      likes_count: Number(r.likes_count ?? 0),
      reposts_count: Number(r.reposts_count ?? 0),
      replies_count: Number(r.replies_count ?? 0),
      shares_count: Number(r.shares_count ?? 0),
      user_id: String(r.user_id),
      username: r.username ?? '',
      display_name: r.display_name ?? '',
      profile_picture_url: r.profile_picture_url ?? null,
      rank_score: Number(r.rank_score ?? 0),
      viral_score: Number(r.viral_score ?? 0),
      combined_score: Number(r.combined_score ?? 0),
    }));
    return mapped;


  } catch (error) {
    console.error("Error al obtener el feed algorithmic (viral):", error);
    return [];
  }
}
