import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    useColorScheme,
    StyleSheet,
    RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supbase/supabase";
import { toggleFollow, checkFollowStatus } from "@/Services/UserService";
import useAuth from "@/hooks/useAuth";
import { BlurView } from "expo-blur";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Follower {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
    is_verified?: boolean;
    is_private?: boolean;
    isFollowingBack?: boolean;
    followLoading?: boolean;
}

export default function FollowersScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const isDark = useColorScheme() === "dark";
    const currentUser = useAuth();

    const [followers, setFollowers] = useState<Follower[]>([]);
    const [filtered, setFiltered] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [profileOwner, setProfileOwner] = useState<{ display_name: string; username: string } | null>(null);

    const fetchFollowers = useCallback(async () => {
        if (!userId) return;
        try {
            // Fetch profile owner info
            const { data: ownerData } = await supabase
                .from("users")
                .select("display_name, username")
                .eq("id", userId)
                .single();
            if (ownerData) setProfileOwner(ownerData);

            // Fetch followers
            const { data: followsData, error } = await supabase
                .from("follows")
                .select("follower_id")
                .eq("following_id", userId);

            if (error) throw error;
            if (!followsData || followsData.length === 0) {
                setFollowers([]);
                setFiltered([]);
                return;
            }

            const followerIds = followsData.map((f) => f.follower_id);

            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("id, username, display_name, profile_picture_url, is_verified, is_private")
                .in("id", followerIds);

            if (usersError) throw usersError;

            // Check follow-back status for each follower (only if current user is the profile owner)
            const enriched: Follower[] = await Promise.all(
                (usersData || []).map(async (u) => {
                    let isFollowingBack = false;
                    if (currentUser && currentUser.id !== u.id) {
                        isFollowingBack = await checkFollowStatus(currentUser.id, u.id);
                    }
                    return { ...u, isFollowingBack, followLoading: false };
                })
            );

            setFollowers(enriched);
            setFiltered(enriched);
        } catch (err) {
            console.error("Error fetching followers:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId, currentUser?.id]);

    useEffect(() => {
        fetchFollowers();
    }, [fetchFollowers]);

    useEffect(() => {
        if (!search.trim()) {
            setFiltered(followers);
            return;
        }
        const q = search.toLowerCase();
        setFiltered(
            followers.filter(
                (f) =>
                    f.username.toLowerCase().includes(q) ||
                    f.display_name.toLowerCase().includes(q)
            )
        );
    }, [search, followers]);

    const handleFollowToggle = async (targetId: string) => {
        if (!currentUser) return;

        setFollowers((prev) =>
            prev.map((f) => (f.id === targetId ? { ...f, followLoading: true } : f))
        );

        try {
            const nowFollowing = await toggleFollow(currentUser.id, targetId);
            setFollowers((prev) =>
                prev.map((f) =>
                    f.id === targetId ? { ...f, isFollowingBack: nowFollowing, followLoading: false } : f
                )
            );
            setFiltered((prev) =>
                prev.map((f) =>
                    f.id === targetId ? { ...f, isFollowingBack: nowFollowing, followLoading: false } : f
                )
            );
        } catch {
            setFollowers((prev) =>
                prev.map((f) => (f.id === targetId ? { ...f, followLoading: false } : f))
            );
        }
    };

    const renderItem = ({ item }: { item: Follower }) => {
        const isCurrentUser = currentUser?.id === item.id;
        const isProfileOwner = userId === currentUser?.id;

        return (
            <TouchableOpacity
                style={[styles.userRow, { borderBottomColor: isDark ? "#1f1f1f" : "#f0f0f0" }]}
                activeOpacity={0.7}
                onPress={() => router.push(`/perfil/${item.id}`)}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {item.profile_picture_url ? (
                        <Image source={{ uri: item.profile_picture_url }} style={styles.avatar} />
                    ) : (
                        <View
                            style={[
                                styles.avatarFallback,
                                { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" },
                            ]}
                        >
                            <Ionicons name="person" size={22} color={isDark ? "#555" : "#aaa"} />
                        </View>
                    )}
                </View>

                {/* User info */}
                <View style={styles.userInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text
                            style={[styles.displayName, { color: isDark ? "#fff" : "#000" }]}
                            numberOfLines={1}
                        >
                            {item.display_name || item.username}
                        </Text>
                        {item.is_verified && (
                            <Ionicons name="checkmark-circle" size={15} color="#3b82f6" />
                        )}
                    </View>
                    <Text style={[styles.username, { color: isDark ? "#666" : "#999" }]} numberOfLines={1}>
                        @{item.username}
                    </Text>
                </View>

                {/* Follow button (only show if not the profile owner themselves) */}
                {!isCurrentUser && (
                    <TouchableOpacity
                        onPress={() => handleFollowToggle(item.id)}
                        disabled={item.followLoading}
                        style={[
                            styles.followBtn,
                            item.isFollowingBack
                                ? { backgroundColor: isDark ? "#1f1f1f" : "#f0f0f0", borderWidth: 1, borderColor: isDark ? "#333" : "#ddd" }
                                : { backgroundColor: isDark ? "#fff" : "#000" },
                        ]}
                        activeOpacity={0.8}
                    >
                        {item.followLoading ? (
                            <ActivityIndicator
                                size="small"
                                color={item.isFollowingBack ? (isDark ? "#fff" : "#000") : (isDark ? "#000" : "#fff")}
                            />
                        ) : (
                            <Text
                                style={[
                                    styles.followBtnText,
                                    {
                                        color: item.isFollowingBack
                                            ? isDark ? "#fff" : "#000"
                                            : isDark ? "#000" : "#fff",
                                    },
                                ]}
                            >
                                {item.isFollowingBack ? "siguiendo" : "seguir"}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const SearchBar = () =>
        Platform.OS === "ios" ? (
            <BlurView
                intensity={isDark ? 30 : 50}
                tint={isDark ? "dark" : "light"}
                style={[styles.searchWrapper, { borderColor: isDark ? "#222" : "#e5e5e5" }]}
            >
                <Ionicons name="search" size={16} color={isDark ? "#555" : "#aaa"} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar seguidores..."
                    placeholderTextColor={isDark ? "#555" : "#bbb"}
                    style={[styles.searchInput, { color: isDark ? "#fff" : "#000" }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={isDark ? "#555" : "#bbb"} />
                    </TouchableOpacity>
                )}
            </BlurView>
        ) : (
            <View
                style={[
                    styles.searchWrapper,
                    { backgroundColor: isDark ? "#111" : "#f5f5f5", borderColor: isDark ? "#222" : "#e5e5e5" },
                ]}
            >
                <Ionicons name="search" size={16} color={isDark ? "#555" : "#aaa"} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar seguidores..."
                    placeholderTextColor={isDark ? "#555" : "#bbb"}
                    style={[styles.searchInput, { color: isDark ? "#fff" : "#000" }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={isDark ? "#555" : "#bbb"} />
                    </TouchableOpacity>
                )}
            </View>
        );

    const Header = () => (
        <View style={{ backgroundColor: isDark ? "#000" : "#fff" }}>
            {/* Top bar */}
            <View style={[styles.topBar, { borderBottomColor: isDark ? "#111" : "#f0f0f0" }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="chevron-back" size={26} color={isDark ? "#fff" : "#000"} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 4 }}>
                    <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>
                        Seguidores
                    </Text>
                    {profileOwner && (
                        <Text style={[styles.headerSubtitle, { color: isDark ? "#555" : "#aaa" }]}>
                            @{profileOwner.username}
                        </Text>
                    )}
                </View>
                <Text style={[styles.countBadge, { color: isDark ? "#3b82f6" : "#2563eb" }]}>
                    {followers.length}
                </Text>
            </View>

            {/* Search bar */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <SearchBar />
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView
                style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
                edges={[]}
            >
                <Header />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
            edges={[]}
        >
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={<Header />}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchFollowers();
                        }}
                        tintColor="#3b82f6"
                        colors={["#3b82f6"]}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name={search ? "search-outline" : "people-outline"}
                            size={56}
                            color={isDark ? "#2a2a2a" : "#e5e5e5"}
                        />
                        <Text style={[styles.emptyTitle, { color: isDark ? "#333" : "#ccc" }]}>
                            {search ? "Sin resultados" : "Sin seguidores aún"}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: isDark ? "#2a2a2a" : "#ddd" }]}>
                            {search
                                ? "Prueba con otro nombre de usuario"
                                : "Cuando alguien siga este perfil aparecerá aquí"}
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        marginRight: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: "500",
        marginTop: 1,
    },
    countBadge: {
        fontSize: 18,
        fontWeight: "900",
    },
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 9,
        gap: 8,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        padding: 0,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    userInfo: {
        flex: 1,
        marginRight: 8,
    },
    displayName: {
        fontSize: 15,
        fontWeight: "700",
    },
    username: {
        fontSize: 13,
        fontWeight: "500",
        marginTop: 2,
    },
    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 88,
        alignItems: "center",
        justifyContent: "center",
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: "700",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
        lineHeight: 20,
    },
});