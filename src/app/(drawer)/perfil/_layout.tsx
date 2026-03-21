import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, MaterialTabBar } from "react-native-collapsible-tab-view";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import useAuth from "@/hooks/useAuth";
import { ProfileRefreshContext } from "@/Controller/_context";
import { supabase } from "@/lib/supbase/supabase";
import { Usuario } from "@/Types/Users";
import { checkFollowStatus } from "@/Services/UserService";

export default function PerfilLayout() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const currentUser = useAuth();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const [profileUser, setProfileUser] = useState<Usuario | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    const fetchProfileData = useCallback(async () => {
        if (!id) return;
        
        setLoading(true);
        try {
            // Fetch User Metadata
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            
            if (userError) throw userError;
            setProfileUser(userData);

            // Fetch Follow Status if not me
            if (currentUser && currentUser.id !== id) {
                const following = await checkFollowStatus(currentUser.id, id);
                setIsFollowing(following);
            }
        } catch (error) {
            console.error("Error fetching profile layout data:", error);
        } finally {
            setLoading(false);
        }
    }, [id, currentUser?.id]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const renderHeader = useCallback(() => {
        if (loading || !profileUser) return null;
        
        return (
            <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <ProfileAppBar user={profileUser} isMe={currentUser?.id === id} />
                <ProfileHeader 
                    user={profileUser} 
                    isMe={currentUser?.id === id}
                    isFollowing={isFollowing}
                    onFollowChange={setIsFollowing}
                />
            </View>
        );
    }, [isDark, profileUser, loading, currentUser?.id, id, isFollowing]);

    const renderTabBar = useCallback((props: any) => (
        <MaterialTabBar
            {...props}
            style={{
                backgroundColor: isDark ? '#000' : '#fff',
                elevation: 0,
                shadowColor: 'transparent',
            }}
            contentContainerStyle={{ justifyContent: 'center' }}
            tabStyle={{ height: 48, margin: 12 }}
            indicatorStyle={{
                backgroundColor: isDark ? '#fff' : '#000',
                height: 2,
            }}
            activeColor={isDark ? '#fff' : '#000'}
            inactiveColor={isDark ? '#888' : '#aaa'}
            labelStyle={{ fontWeight: 'bold', fontSize: 13, textTransform: 'lowercase' }}
        />
    ), [isDark]);

    if (loading && !profileUser) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </SafeAreaView>
        );
    }

    return (
        <ProfileRefreshContext.Provider value={{ refreshStats: refreshStatsFn, setRefreshStats: setRefreshStatsFn }}>
            <SafeAreaView style={{ flex: 1 }} className={isDark ? 'bg-black' : 'bg-white'} edges={['top']}>
                <Tabs.Container
                    renderHeader={renderHeader}
                    renderTabBar={renderTabBar}
                >
                    <Tabs.Tab
                        name="index"
                        label={() => (
                            <View style={{ paddingBottom: 10 }}>
                                <Ionicons name="grid" size={20} color={isDark ? '#fff' : '#000'} />
                            </View>
                        )}
                    >
                        <Slot />
                    </Tabs.Tab>
                </Tabs.Container>
            </SafeAreaView>
        </ProfileRefreshContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});