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

    // Deduplicar por post_id: si el mismo post aparece varias veces en el batch
    // (e.g. el usuario scrolleó hacia atrás), sumar dwell_time_seconds.
    // PostgreSQL ON CONFLICT DO UPDATE no puede afectar la misma fila dos veces
    // en un solo INSERT, así que deduplicamos aquí.
    const deduped = Object.values(
      interactions.reduce<Record<string, InteractionPayload>>((acc, item) => {
        if (acc[item.post_id]) {
          acc[item.post_id].dwell_time_seconds += item.dwell_time_seconds;
        } else {
          acc[item.post_id] = { ...item };
        }
        return acc;
      }, {})
    );

    const { error } = await supabase.rpc('registrar_retencion_lote', { 
      payload: deduped 
    });

    if (error) throw error;
  } catch (error) {
    console.error("❌ [InteractionService] Error registrando interacciones:", error);
  }
}
