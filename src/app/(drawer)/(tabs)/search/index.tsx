import React, { useEffect, useState, useMemo, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, useColorScheme, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SearchContext } from './_layout';
import { Trending_topics } from '@/Types/Trendings';
import { supabase } from '@/lib/supbase/supabase';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type TrendFromQuery = Omit<Trending_topics, 'trending_hashtags'> & {
  trending_hashtags?: { hashtag: string }[];
};

type TrendWithTags = TrendFromQuery & { hashtags: string[] };

export default function SearchScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { searchQuery } = useContext(SearchContext);
  const [trending, setTrending] = useState<TrendWithTags[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchTrending();
  }, []);

  const featuredTrend = trending[0];
  const otherTrends = trending.slice(1);

  // Categorías estáticas para el grid "Discovery"
  const categories = [
    { id: '1', name: 'Tecnología', icon: 'hardware-chip-outline', color: ['#3b82f6', '#1d4ed8'] },
    { id: '2', name: 'Noticias', icon: 'trail-sign-outline', color: ['#ef4444', '#b91c1c'] },
    { id: '3', name: 'Deportes', icon: 'football-outline', color: ['#10b981', '#047857'] },
    { id: '4', name: 'Música', icon: 'musical-notes-outline', color: ['#8b5cf6', '#6d28d9'] },
    { id: '5', name: 'Ciencia', icon: 'flask-outline', color: ['#f59e0b', '#d97706'] },
    { id: '6', name: 'Cultura', icon: 'library-outline', color: ['#ec4899', '#be185d'] },
  ];

  const renderHeader = () => (
    <View className="px-5 pt-4">
      {/* SECCIÓN DESTACADA */}
      {featuredTrend && !searchQuery && (
        <View className="mb-8">
          <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">Para ti</Text>
          <TouchableOpacity activeOpacity={0.9} className="overflow-hidden rounded-[32px] shadow-xl">
            <LinearGradient
              colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
              style={{ height: 180, width: '100%' }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View className="absolute right-[-20] top-[-20] opacity-10">
                <Ionicons name="trending-up" size={120} color={isDark ? '#fff' : '#000'} />
              </View>
              <View className="flex-1 p-6 justify-between">
                <View>
                  <View className="bg-blue-500 self-start px-3 py-1 rounded-full mb-3">
                    <Text className="text-[10px] font-black text-white uppercase italic">Tendencia Global</Text>
                  </View>
                  <Text className="text-2xl font-black text-black dark:text-white leading-7">
                    {featuredTrend.topic_name}
                  </Text>
                  <Text className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-tight">
                    {featuredTrend.category} • {featuredTrend.volume_score.toLocaleString()} posts
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-blue-500 font-bold mr-1">Descubrir más</Text>
                  <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* GRID DE CATEGORÍAS (Solo se muestra cuando no hay búsqueda) */}
      {/* {!searchQuery && (
        <View className="mb-8">
          <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4 ml-1">Explorar categorías</Text>
          <View className="flex-row flex-wrap justify-between">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={{ width: COLUMN_WIDTH, height: 100 }}
                className="mb-4 rounded-[24px] overflow-hidden"
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={cat.color}
                  className="flex-1 p-4 justify-between"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={cat.icon as any} size={24} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: 12, top: 12 }} />
                  <View className="flex-1 justify-end">
                    <Text className="text-white font-black text-lg leading-5">{cat.name}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )} */}

      {/* TÍTULO LISTA DE RESULTADOS O TENDENCIAS RESTANTES */}
      <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 ml-1">
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
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            className="mx-4 mb-3 rounded-[24px] overflow-hidden border border-gray-100 dark:border-white/5"
          >
            <BlurView
              intensity={isDark ? 10 : 0}
              tint={isDark ? 'dark' : 'light'}
              className="p-5"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-black text-black dark:text-white mb-1">
                    {item.topic_name}
                  </Text>
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {item.category} • {item.region}
                  </Text>
                </View>
                <View className="items-end">
                   <Text className="text-sm font-black text-blue-500">
                    {item.volume_score}
                   </Text>
                   <Text className="text-[8px] font-bold text-gray-500 uppercase">Impacto</Text>
                </View>
              </View>

              <View className="flex-row flex-wrap mt-4">
                {item.hashtags.slice(0, 3).map((hashtag, index) => (
                  <View
                    key={index}
                    className="bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full mr-2 mb-2"
                  >
                    <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">{hashtag}</Text>
                  </View>
                ))}
              </View>
            </BlurView>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}