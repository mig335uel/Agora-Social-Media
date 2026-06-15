import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, useGlobalSearchParams } from "expo-router";
import { ProfileRefreshContext } from "@/Controller/_context";
import { supabase } from "@/lib/supbase/supabase";
import useAuth from "@/hooks/useAuth";
import { checkFollowStatus, checkBlockStatus } from "@/Services/UserService";
import { Usuario } from "@/Types/Users";

// 1. Crear el contexto para compartir los datos del perfil
export const ProfileDataContext = createContext<{
    profileUser: Usuario | null;
    isFollowing: boolean;
    isPending: boolean;
    isBlocked: boolean;
    isMe: boolean;
    loadingProfile: boolean;
    setIsFollowing: (val: boolean) => void;
    setIsPending: (val: boolean) => void;
    setIsBlocked: (val: boolean) => void;
    fetchProfileData: () => Promise<void>;
} | null>(null);

export function useProfileData() {
    const context = useContext(ProfileDataContext);
    if (!context) {
        throw new Error("useProfileData debe usarse dentro de ProfileDataContext");
    }
    return context;
}

export default function PerfilLayout() {
    const isDark = useColorScheme() === 'dark';
    const { id } = useGlobalSearchParams<{ id: string }>();
    const currentUser = useAuth();

    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    // Estado centralizado del perfil
    const [profileUser, setProfileUser] = useState<Usuario | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const isMe = currentUser?.id === id;

    // 2. Mover la lógica de carga aquí (Single Source of Truth)
    const fetchProfileData = useCallback(async () => {
        if (!id) return;
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) throw userError;
            setProfileUser(userData);

            if (currentUser && currentUser.id !== id) {
                // Cargar follow, pending y block en paralelo
                const [following, blocked] = await Promise.all([
                    checkFollowStatus(currentUser.id, id),
                    checkBlockStatus(currentUser.id, id),
                ]);
                setIsFollowing(following);
                setIsBlocked(blocked);

                // Si no lo sigue y el usuario es privado, verificar si hay solicitud pendiente
                if (!following && (userData as Usuario).is_private && !blocked) {
                    const { checkFollowRequestStatus } = require("@/Services/UserService");
                    const pending = await checkFollowRequestStatus(currentUser.id, id);
                    setIsPending(pending);
                } else {
                    setIsPending(false);
                }
            }
        } catch (error) {
            console.error("Error fetching profile layout data:", error);
        } finally {
            setLoadingProfile(false);
        }
    }, [id, currentUser?.id]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    return (
        <ProfileRefreshContext.Provider value={{ refreshStats: refreshStatsFn, setRefreshStats: setRefreshStatsFn }}>
            <ProfileDataContext.Provider value={{ profileUser, isFollowing, isPending, isBlocked, isMe, loadingProfile, setIsFollowing, setIsPending, setIsBlocked, fetchProfileData }}>
                <SafeAreaView style={{ flex: 1 }} className={isDark ? 'bg-black' : 'bg-white'} edges={['top']}>
                    <Slot />
                </SafeAreaView>
            </ProfileDataContext.Provider>
        </ProfileRefreshContext.Provider>
    );
}