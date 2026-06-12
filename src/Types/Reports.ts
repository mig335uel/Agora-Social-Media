export type ReportContext = 'post' | 'user';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Report {
    id: string;
    context: ReportContext;
    reporter_id: string;
    post_id?: string;       // solo si context = 'post'
    user_id?: string;       // solo si context = 'user'
    description: string;
    status: ReportStatus;
    created_at: string;
}

export interface ReportMessage {
    id: string;
    report_id: string;
    content: string;
    user_id: string;      // UUID del reportador o de la cuenta plataforma (moderador)
    created_at: string;
}

// Para crear un nuevo reporte desde la app móvil
export type CreateReportDTO =
    | {
          context: 'post';
          post_id: string;
          description: string;
      }
    | {
          context: 'user';
          user_id: string;
          description: string;
      };

// Reporte con mensajes incluidos (para la vista de detalle)
export interface ReportWithMessages extends Report {
    messages: ReportMessage[];
}