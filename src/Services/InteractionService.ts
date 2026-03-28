import { supabase } from "../lib/supbase/supabase";

export interface InteractionPayload {
  post_id: string;
  dwell_time_seconds: number;
}

/**
 * Registra un lote de interacciones (dwell time) en la base de datos para aprender sobre los intereses del usuario.
 */
export async function recordInteractions(interactions: InteractionPayload[]) {
  if (interactions.length === 0) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // El sistema sugiere usar 'increment_user_interests_for_post' con p_post_id y p_user_id
    const promises = interactions.map(item => 
      supabase.rpc('increment_user_interests_for_post', { 
        p_post_id: item.post_id,
        p_user_id: user.id
      })
    );

    const results = await Promise.all(promises);
    const firstError = results.find(r => r.error)?.error;
    
    if (firstError) throw firstError;

    
  } catch (error) {
    console.error("❌ [InteractionService] Error registrando interacciones:", error);
  }
}
