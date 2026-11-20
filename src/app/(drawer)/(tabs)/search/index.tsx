import React, { useEffect, useState, useMemo, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SearchContext } from './_layout';
import { Trending_topics } from '@/Types/Trendings';
import { supabase } from '@/lib/supbase/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EventoElecciones29N from '@/Components/Elecciones/EventoElecciones29N';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type TrendFromQuery = Omit<Trending_topics, 'trending_hashtags'> & {
  trending_hashtags?: { hashtag: string }[];
};

type TrendWithTags = TrendFromQuery & { hashtags: string[] };

export default function SearchScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const [trending, setTrending] = useState<TrendWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const filteredTrends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trending;
    return trending.filter((item) => {
      const topic = item.topic_name.toLowerCase();
      const tags = (item.hashtags || []).join(' ').toLowerCase();
      return topic.includes(q) || tags.includes(q);
    });
  }, [searchQuery, trending]);

  const fetchTrending = async () => {
    setLoading(true);
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
    } else if (data) {
      const unified: TrendWithTags[] = data.map((trend) => {
        const nestedHashtags = (trend as any).trending_hashtags || [];
        return {
          ...trend,
          hashtags: nestedHashtags.map((h: { hashtag: string }) => h.hashtag),
        } as TrendWithTags;
      });
      setTrending(unified);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  const featuredTrend = trending[0];
  const otherTrends = trending.slice(1);

  const onRefresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
    fetchTrending();
  }, []);

  const renderHeader = () => (
    <View className="px-5 pt-4">
      {/* EVENTO EXTRAORDINARIO: ELECCIONES GENERALES 29N */}
      <EventoElecciones29N
        externalSearchQuery={searchQuery}
        onSelectHashtag={(tag) => setSearchQuery(tag)}
        refreshTrigger={refreshTick}
      />

      {/* SECCIÓN DESTACADA (TENDENCIA GLOBAL) */}
      {featuredTrend && !searchQuery && (
        <View className="mb-8">
          <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">
            Para ti
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            className="overflow-hidden rounded-[32px] shadow-xl"
          >
            <LinearGradient
              colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
              style={{ height: 180, width: '100%' }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View className="absolute right-[-20] top-[-20] opacity-10">
                <Ionicons
                  name="trending-up"
                  size={120}
                  color={isDark ? '#fff' : '#000'}
                />
              </View>
              <View className="flex-1 p-6 justify-between">
                <View>
                  <View className="bg-blue-500 self-start px-3 py-1 rounded-full mb-3">
                    <Text className="text-[10px] font-black text-white uppercase italic">
                      Tendencia Global
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-black dark:text-white leading-7">
                    {featuredTrend.topic_name}
                  </Text>
                  <Text className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-tight">
                    {featuredTrend.category} •{' '}
                    {featuredTrend.volume_score.toLocaleString()} posts
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-blue-500 font-bold mr-1">
                    Descubrir más
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* TÍTULO LISTA DE RESULTADOS O TENDENCIAS RESTANTES */}
      <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">
        {searchQuery ? 'Resultados de búsqueda' : 'Tendencias agora'}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }} className={isDark ? 'bg-black' : 'bg-white'}>
      <FlatList
        data={searchQuery ? filteredTrends : otherTrends}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        onRefresh={onRefresh}
        refreshing={loading}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            className="mx-5 mb-3.5 rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10"
          >
            <BlurView
              intensity={isDark ? 15 : 0}
              tint={isDark ? 'dark' : 'light'}
            >
              <View className="p-5">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-black dark:text-white leading-6 mb-1">
                      {item.topic_name}
                    </Text>
                    <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      {item.category} • {item.region}
                    </Text>
                  </View>
                  <View className="items-end pl-2">
                    <Text className="text-base font-black text-blue-500 leading-5">
                      {item.volume_score}
                    </Text>
                    <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                      Impacto
                    </Text>
                  </View>
                </View>

                {item.hashtags && item.hashtags.length > 0 && (
                  <View className="flex-row flex-wrap mt-3.5 -mb-1.5">
                    {item.hashtags.slice(0, 3).map((hashtag, index) => (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.7}
                        onPress={() => setSearchQuery(hashtag)}
                        className="bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-full mr-2 mb-1.5"
                      >
                        <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                          #{hashtag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
