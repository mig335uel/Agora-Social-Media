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
    const { error } = await supabase.rpc('record_user_interactions', {
      payload: interactions
    });

    if (error) throw error;
    console.log(`✅ [InteractionService] Registradas ${interactions.length} interacciones.`);
  } catch (error) {
    console.error("❌ [InteractionService] Error registrando interacciones:", error);
  }
}
