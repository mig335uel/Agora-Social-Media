import React, { useEffect, useState, useMemo, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, useColorScheme, StyleSheet } from 'react-native';
import { SearchContext } from './_layout';
import { Trending_topics } from '@/Types/Trendings';
import { supabase } from '@/lib/supbase/supabase';
import { Stack } from 'expo-router';






type TrendFromQuery = Omit<Trending_topics, 'trending_hashtags'> & {
    trending_hashtags?: { hashtag: string }[];
};

type TrendWithTags = TrendFromQuery & { hashtags: string[] };

export default function search() {

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const { searchQuery } = useContext(SearchContext);
    const [trending, setTrending] = useState<TrendWithTags[]>([]);

    const filteredTrends = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return trending;
        return trending.filter((item) => {
            const topic = item.topic_name.toLowerCase();
            const tags = (item.hashtags || []).join(' ').toLowerCase();
            return topic.includes(q) || tags.includes(q);
        });
    }, [searchQuery, trending]);

    useEffect(() => {
        // Se define una función asíncrona dentro de useEffect porque
        // useEffect en sí no puede tener `async` directamente.
        const fetchTrending = async () => {
            const { data, error } = await supabase
                .from('trending_topics')
                .select(`
                    id,
                    created_at,
                    topic_name,
                    category,
                    region,
                    volume_score,
                    expires_at,
                    trending_hashtags ( hashtag )
                `)
                .order('volume_score', { ascending: false });

            if (error) {
                console.error('Error cargando trending:', error);
                return;
            }

            if (!data) {
                setTrending([]);
                return;
            }

            // Normalizamos la respuesta a un array plano con hashtags extraídos
            const unified: TrendWithTags[] = data.map((trend) => {
                const nestedHashtags = (trend as any).trending_hashtags || [];
                return {
                    ...trend,
                    hashtags: nestedHashtags.map((h: { hashtag: string }) => h.hashtag),
                };
            });

            setTrending(unified);
        };

        fetchTrending();
    }, []);

    return (
        <>  
            <FlatList
                data={filteredTrends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: isDark ? '#333' : '#ccc', backgroundColor: isDark ? '#000' : '#fff' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{item.topic_name}</Text>
                        <Text style={{ color: isDark ? '#aaa' : '#555' }}>{item.category} - {item.region}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                            {item.hashtags.map((hashtag, index) => (
                                <TouchableOpacity key={index} style={{ backgroundColor: isDark ? '#555' : '#eee', padding: 8, borderRadius: 16, marginRight: 8, marginBottom: 8 }}>
                                    <Text style={{ color: isDark ? '#fff' : '#000' }}>#{hashtag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            />
        </>
    );
}



//estilos únicamente personalizados


const styles = StyleSheet.create({

});