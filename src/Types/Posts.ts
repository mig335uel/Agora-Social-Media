import { Usuario } from "./Users";

export interface Post {
    id: string;
    
    content: string;
    parent_post_id?: string | null;

    likes_count: number;
    replies_count: number;
    reposts_count: number;
    shares_count: number;
    created_at: string;
    user?: Usuario;
    media?: media_feature[];
}

export interface media_feature{
    media_url: string | null;
    post_id: string;
}

export interface likes{
    post_id: string;
    created_at: string;
}