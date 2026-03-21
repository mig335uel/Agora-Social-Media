import { useContext, useEffect, useState } from "react";
import { View, Text, useColorScheme, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { SearchContext } from './_layout';
import { supabase } from "@/lib/supbase/supabase";
import { Usuario } from "@/Types/Users";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function UserSearch() {
    const isDark = useColorScheme() === 'dark';
    const { searchQuery } = useContext(SearchContext);
    const [userSearch, setUserSearch] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUserSearch = async (query: string) => {
        if (!query.trim()) {
            setUserSearch([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(20);

            if (error) throw error;
            setUserSearch(data || []);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchUserSearch(searchQuery);
        }, 300); // Debounce to avoid too many requests

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    const renderUserList = ({ item }: { item: Usuario }) => {
        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => router.push(`/perfil/${item.id}`)}
                className={`flex-row items-center p-4 ${isDark ? 'bg-black' : 'bg-white'}`}
                style={[styles.userRow, { borderColor: isDark ? '#222' : '#f0f0f0' }]}
            >
                <Image
                    source={{ uri: item.profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.displayName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                            {item.display_name}
                        </Text>
                        {item.is_verified && (
                            <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
                        )}
                    </View>
                    <Text style={[styles.username, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>
                        @{item.username}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#444' : '#ccc'} />
            </TouchableOpacity>
        );
    }

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            {!searchQuery ? (
                <>
                    <Ionicons name="search-outline" size={64} color={isDark ? '#222' : '#f0f0f0'} />
                    <Text style={[styles.emptyText, { color: isDark ? '#444' : '#999' }]}>
                        Busca personas por nombre o @usuario
                    </Text>
                </>
            ) : !loading && (
                <>
                    <Ionicons name="person-remove-outline" size={64} color={isDark ? '#222' : '#f0f0f0'} />
                    <Text style={[styles.emptyText, { color: isDark ? '#444' : '#999' }]}>
                        No encontramos a nadie con "{searchQuery}"
                    </Text>
                </>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
            {loading && (
                <View style={styles.loadingBar}>
                    <ActivityIndicator size="small" color="#1DA1F2" />
                </View>
            )}
            <FlatList
                data={userSearch}
                keyExtractor={(item) => item.id}
                renderItem={renderUserList}
                ListEmptyComponent={EmptyState}
                contentContainerStyle={userSearch.length === 0 ? { flex: 1 } : null}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    displayName: {
        fontSize: 16,
        fontWeight: '700',
    },
    username: {
        fontSize: 14,
        marginTop: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingBar: {
        paddingVertical: 10,
        alignItems: 'center',
    }
});