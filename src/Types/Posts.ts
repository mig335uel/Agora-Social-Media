export interface Post{
    id: string;
    user_id: string;
    content: string;
    parent_post_id: string | null;
    media_url: string;
    media_type: string;
    likes_count: number;
    replies_count: number;
    reposts_count: number;
    created_at: string;
}

export interface likes{
    post_id: string;
    created_at: string;
}