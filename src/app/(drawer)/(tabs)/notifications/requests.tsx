import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    useColorScheme,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "@/hooks/useAuth";
import {
    getFollowRequests,
    FollowRequest,
    FollowRequestAccept,
    rejectFollowRequest,
} from "@/Services/UserService";

// ─── Tiempo relativo ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

// ─── Item de solicitud ────────────────────────────────────────────────────────
function RequestItem({
    item,
    isDark,
    onAccept,
    onReject,
}: {
    item: FollowRequest;
    isDark: boolean;
    onAccept: (req: FollowRequest) => void;
    onReject: (req: FollowRequest) => void;
}) {
    const [loading, setLoading] = useState(false);
    const textColor = isDark ? "#fff" : "#0f0f0f";
    const subColor = isDark ? "#888" : "#6b6b6b";
    const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const cardBg = isDark ? "#111" : "#fff";

    const requester = item.requester;

    const handleAccept = async () => {
        setLoading(true);
        try {
            await onAccept(item);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            await onReject(item);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.item, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            {/* Avatar */}
            <TouchableOpacity
                onPress={() => router.push(`/perfil/${requester.id}`)}
                activeOpacity={0.8}
                style={styles.avatarWrapper}
            >
                {requester.profile_picture_url ? (
                    <Image source={{ uri: requester.profile_picture_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "#333" : "#e5e7eb" }]}>
                        <Ionicons name="person" size={22} color={isDark ? "#555" : "#aaa"} />
                    </View>
                )}
            </TouchableOpacity>

            {/* Info */}
            <TouchableOpacity
                style={styles.info}
                onPress={() => router.push(`/perfil/${requester.id}`)}
                activeOpacity={0.8}
            >
                <View style={styles.nameRow}>
                    <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                        {requester.display_name}
                    </Text>
                    {requester.is_verified && (
                        <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                    )}
                </View>
                <Text style={[styles.username, { color: subColor }]}>@{requester.username}</Text>
                <Text style={[styles.time, { color: subColor }]}>{timeAgo(item.created_at)}</Text>
            </TouchableOpacity>

            {/* Botones */}
            {loading ? (
                <ActivityIndicator size="small" color="#1DA1F2" style={{ marginLeft: 12 }} />
            ) : (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.acceptBtn]}
                        onPress={handleAccept}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.acceptText}>Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.rejectBtn, { borderColor: isDark ? "#333" : "#ddd" }]}
                        onPress={handleReject}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={16} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function FollowRequestsScreen() {
    const isDark = useColorScheme() === "dark";
    const user = useAuth();

    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const bg = isDark ? "#000" : "#fff";
    const emptyColor = isDark ? "#555" : "#aaa";

    const fetchRequests = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await getFollowRequests(user.id);
        setRequests(data);

        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAccept = async (req: FollowRequest) => {
        try {
            await FollowRequestAccept(req.requester_id, req.requested_id);
            // Quitar de la lista local
            setRequests(prev => prev.filter(r => r.requester_id !== req.requester_id));
        } catch (e) {
            Alert.alert("Error", "No se pudo aceptar la solicitud.");
        }
    };

    const handleReject = async (req: FollowRequest) => {
        try {
            await rejectFollowRequest(req.requester_id, req.requested_id);
            setRequests(prev => prev.filter(r => r.requester_id !== req.requester_id));
        } catch (e) {
            Alert.alert("Error", "No se pudo rechazar la solicitud.");
        }
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
        );
    }

    return (
        <FlatList
            data={requests}
            keyExtractor={(item) => item.requester_id}
            style={{ backgroundColor: bg }}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchRequests(true)}
                    tintColor="#1DA1F2"
                    colors={["#1DA1F2"]}
                />
            }
            renderItem={({ item }) => (
                <RequestItem
                    item={item}
                    isDark={isDark}
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}
            ListEmptyComponent={() => (
                <View style={styles.centered}>
                    <Ionicons name="people-outline" size={52} color={emptyColor} />
                    <Text style={[styles.emptyText, { color: emptyColor }]}>
                        No tienes solicitudes pendientes
                    </Text>
                    <Text style={[styles.emptySub, { color: emptyColor }]}>
                        Cuando alguien quiera seguirte,{"\n"}aparecerá aquí
                    </Text>
                </View>
            )}
        />
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: "600",
        marginTop: 4,
    },
    emptySub: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    avatarWrapper: {
        width: 50,
        height: 50,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    displayName: {
        fontSize: 15,
        fontWeight: "700",
        flexShrink: 1,
    },
    username: {
        fontSize: 13,
    },
    time: {
        fontSize: 12,
        marginTop: 2,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    btn: {
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    acceptBtn: {
        backgroundColor: "#1DA1F2",
    },
    acceptText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
    },
    rejectBtn: {
        borderWidth: 1.5,
        paddingHorizontal: 10,
    },
});
