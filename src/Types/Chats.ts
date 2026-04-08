export interface Chats {
    id: string;
    type: string;
    name: string | null;
    created_at?: string;
}

export interface chat_content {
    id: string;
    chat_id: string;
    content: string;
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
    message_id: string; // Recién agregado en tu script
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