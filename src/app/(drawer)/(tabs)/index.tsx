import { Redirect } from 'expo-router';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator, useColorScheme, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '@/Services/authService';
import CreatePostScreen from '@/Components/createPosts';
import { getForYouFeed, RankedPost } from '@/Services/FeedService';
import { recordInteractions, InteractionPayload } from '@/Services/InteractionService';
import useAuth from '@/hooks/useAuth';
import { Usuario } from '@/Types/Users';
import UserAvatar from '@/Components/UserAvatar';
import AppBar from '@/Components/AppBar';
import { posts } from '@/Components/Prueba.json';
import PostCard from '@/Components/Posts/PostsCard';
import { Post } from '@/Types/Posts';
import TopBarNavigation from './feed/_layout';

export default function Home() {
    // const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Tracking de dwell time
    const visibleItems = useRef<Set<string>>(new Set());
    const dwellBuffer = useRef<{ [postId: string]: number }>({});
    const lastSyncTime = useRef(Date.now());
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const pruebaPost: Post[] = posts;

    // const fetchFeed = async () => {
    //     try {
    //         const feed = await getForYouFeed();
    //         setPosts(feed);
    //     } catch (error) {
    //         console.error("Error fetching feed:", error);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // };

    useEffect(() => {
        // fetchFeed();

        // Timer para acumular dwell time cada segundo
        const timer = setInterval(() => {
            visibleItems.current.forEach(postId => {
                dwellBuffer.current[postId] = (dwellBuffer.current[postId] || 0) + 1;
            });

            // Sincronizar con Supabase cada 30 segundos si hay datos
            if (Date.now() - lastSyncTime.current > 30000) {
                syncInteractions();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            syncInteractions(); // Sincronización final
        };
    }, []);

    const syncInteractions = async () => {
        const payload: InteractionPayload[] = Object.keys(dwellBuffer.current).map(postId => ({
            post_id: postId,
            dwell_time_seconds: dwellBuffer.current[postId]
        }));

        if (payload.length > 0) {
            await recordInteractions(payload);
            dwellBuffer.current = {}; // Limpiamos buffer
            lastSyncTime.current = Date.now();
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        // fetchFeed();
        syncInteractions(); // Aprovechamos para limpiar buffer
    };

    const logout = async () => {
        try {
            const results = await signOut();
            if (results) router.replace('/login');
        } catch (error) {
            console.log(error);
        }
    }

    // Configuración para detectar qué items son visibles
    const onViewableItemsChanged = useCallback(({ viewableItems: currentlyViewable }: any) => {
        const newVisible = new Set<string>();
        currentlyViewable.forEach((item: any) => {
            if (item.item && item.item.id) newVisible.add(item.item.id);
        });
        visibleItems.current = newVisible;
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50 // Se considera visible si aparece el 50%
    }).current;

    return (
       <Redirect href="/feed" />

    );
}