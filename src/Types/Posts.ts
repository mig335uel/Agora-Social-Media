import { Usuario } from "./Users";

export interface Post {
    id: string;
    
    content: string;
    parent_post_id?: string | null;
    media_url: string | null;
    media_type: string | null;
    likes_count: number;
    replies_count: number;
    reposts_count: number;
    shares_count: number;
    created_at: string;
    user?: Usuario;
}

export interface likes{
    post_id: string;
    created_at: string;
}