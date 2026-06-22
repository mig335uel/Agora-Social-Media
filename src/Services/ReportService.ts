import { supabase } from "../lib/supbase/supabase";
import { CreateReportDTO, Report, ReportWithMessages } from "../Types/Reports";
import { Usuario } from "@/Types/Users";
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





export async function getReportByMe({ user }: { user: Usuario }): Promise<Report[]> {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('reporter_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data ?? []) as Report[];
    } catch (error) {
        console.error('Error al obtener reportes', error);
        return [];
    }
}

export async function getReportById(reportId: string): Promise<ReportWithMessages | null> {
    try {
        // Obtenemos el reporte y sus mensajes en una sola consulta
        // Usamos el foreign key (que supabase detecta automáticamente como report_messages)
        const { data, error } = await supabase
            .from('reports')
            .select('*, reports_messages(*)')
            .eq('id', reportId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Extraemos los mensajes del JOIN
        const rawMessages = data.reports_messages || [];
        // Ordenamos los mensajes cronológicamente
        rawMessages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Eliminamos la clave del JOIN para que coincida con nuestro tipo ReportWithMessages
        delete data.reports_messages;

        return {
            ...data,
            messages: rawMessages
        } as ReportWithMessages;
    } catch (error) {
        console.error('Error al obtener el reporte', error);
        return null;
    }
}

export async function addReportMessage(reportId: string, content: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const payload = {
            report_id: reportId,
            content,
            user_id: user.id
        };

        const { data, error } = await supabase
            .from('reports_messages')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al enviar mensaje', error);
        throw error;
    }
}
