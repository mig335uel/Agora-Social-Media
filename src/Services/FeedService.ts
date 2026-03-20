import { supabase } from "../lib/supbase/supabase";

export interface RankedPost {
  id: string;
  content: string;
  media?: { media_url: string }[];
  created_at: string;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  user_id: string;
  username: string;
  display_name: string;
  profile_picture_url: string | null;
  rank_score: number;
}

/**
 * Obtiene el feed "Para Ti" utilizando el algoritmo de ranking definido en la base de datos.
 */
export async function getForYouFeed(limit: number = 20, offset: number = 0): Promise<RankedPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_for_you_feed', {
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener el feed algorithmic:", error);
    return [];
  }
}
