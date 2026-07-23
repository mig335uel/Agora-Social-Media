import { supabase } from "../lib/supbase/supabase";

export interface InteractionPayload {
  post_id: string;
  dwell_time_seconds: number;
}

/**
 * Registra un lote de interacciones (dwell time) en la base de datos para aprender sobre los intereses del usuario.
 */
export async function recordInteractions(interactions: InteractionPayload[]) {
  if (!interactions || interactions.length === 0) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Agrupar y sumar el tiempo por post_id para evitar duplicados en el lote
    // Esto previene el error Postgres 21000: ON CONFLICT DO UPDATE command cannot affect row a second time
    const map = new Map<string, number>();
    for (const item of interactions) {
      if (item && item.post_id) {
        map.set(item.post_id, (map.get(item.post_id) || 0) + (item.dwell_time_seconds || 0));
      }
    }

    const uniqueInteractions: InteractionPayload[] = Array.from(map.entries()).map(
      ([post_id, dwell_time_seconds]) => ({
        post_id,
        dwell_time_seconds: Math.max(1, dwell_time_seconds),
      })
    );

    if (uniqueInteractions.length === 0) return;

    const { error } = await supabase.rpc('registrar_retencion_lote', { 
      payload: uniqueInteractions 
    });

    if (error) throw error;
  } catch (error) {
    console.error("❌ [InteractionService] Error registrando interacciones:", error);
  }
}
