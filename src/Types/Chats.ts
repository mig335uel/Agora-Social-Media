export interface Chats {
    id: string;
    type: string;
    name: string | null;
    created_at?: string;
}

export interface chat_content {
    id: string;
    chat_id: string;
    content: string; // Formato: "ivBase64:cipherBase64" (AES-GCM)
    sender_id: string;
    created_at?: string;
}

export interface chat_participants {
    chat_id: string;
    user_id: string;
    hidden_at: string | null;
    role: string;
    last_read_at: string | null;
    left_at: string | null;
}

export interface media_feature_chat {
    id: string;
    chat_id: string;
    sender_id: string;
    message_id: string;
    media_url: string;
    created_at?: string;
}

export interface chat_encrypted_keys {
    id: string;
    chat_id: string;
    device_id: string;
    encrypted_key: string;
}

export interface chat_requests {
    id: string;
    chat_id: string;
    sender_id: string;
    receiver_id: string;
    status: string;
    created_at?: string;
}

// ─── Tipos extendidos para UI de mensajería ───────────────────────────────

/** Mensaje ya desencriptado, listo para renderizar en pantalla */
export interface DecryptedMessage {
    id: string;
    chat_id: string;
    sender_id: string;
    content_encrypted: string;  // el raw de la BD
    content: string;            // texto plano tras pasar por el Búnker
    created_at: string;
    isMine: boolean;
}

/** Item de la bandeja de entrada con datos del contacto y último mensaje */
export interface ChatInboxItem {
    chat_id: string;
    chat_type: string;
    chat_name: string | null;
    contact: {
        id: string;
        username: string;
        display_name: string;
        profile_picture_url: string | null;
        is_verified?: boolean;
    };
    last_message: DecryptedMessage | null;
    unread_count: number;
    updated_at: string;
}