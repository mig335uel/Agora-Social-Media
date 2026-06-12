import { supabase } from "../lib/supbase/supabase";
import { CreateReportDTO } from "../Types/Reports";

/**
 * Crea un reporte de post o usuario en la base de datos.
 * El reporter_id se obtiene automáticamente del usuario autenticado.
 */
export async function createReport(dto: CreateReportDTO): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const payload =
        dto.context === 'post'
            ? {
                  context: 'post',
                  reporter_id: user.id,
                  post_id: dto.post_id,
                  user_id: null,
                  reason: dto.reason,
                  description: dto.description,
              }
            : {
                  context: 'user',
                  reporter_id: user.id,
                  post_id: null,
                  user_id: dto.user_id,
                  reason: dto.reason,
                  description: dto.description,
              };

    const { error } = await supabase.from('reports').insert(payload as any);

    if (error) {
        // Reporte duplicado → el usuario ya ha reportado este contenido
        if (error.code === '23505') {
            throw new Error("Ya has reportado este contenido anteriormente.");
        }
        throw error;
    }
}
