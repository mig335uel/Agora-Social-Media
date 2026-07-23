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

    const { error } = await supabase.rpc('registrar_retencion_lote', { 
      payload: interactions 
    });

    if (error) throw error;
  } catch (error) {
    console.error("❌ [InteractionService] Error registrando interacciones:", error);
  }
}
