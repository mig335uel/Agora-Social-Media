

export interface Trending_hashtag {
    id: string;
    trend_id: string;
    hashtag: string;
    is_custom: boolean;
    created_by: string | null;
    created_at: string;
}

export interface Trending_topics {
    id: string;
    topic_name: string;
    category: string;
    region: string;
    volume_score: number;
    created_at: string;
    expires_at: string;
    trending_hashtags?: Trending_hashtag[]; // relación anidada desde Supabase
}