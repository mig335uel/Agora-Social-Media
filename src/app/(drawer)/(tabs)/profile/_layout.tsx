import { View, StyleSheet, useColorScheme, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppBar from "@/Components/AppBar";
import useAuth from "@/hooks/useAuth";
import { MaterialTopTabs } from "@/Components/TopBar/materialtopbars";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supbase/supabase";
import { Post } from "@/Types/Posts";
import { Ionicons } from "@expo/vector-icons";
import { ProfileRefreshContext } from "../../../../Controller/_context";


export default function ProfileLayout() {
    const user = useAuth();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    return (
        <ProfileRefreshContext.Provider value={{ refreshStats: refreshStatsFn, setRefreshStats: setRefreshStatsFn }}>
            <SafeAreaView style={{ flex: 1 }} className={`${isDark ? 'bg-black' : 'bg-white'}`} edges={['top']}>
                <ProfileAppBar user={user || undefined} />
                <ProfileHeader user={user || undefined} />

                <MaterialTopTabs
                    screenOptions={{
                        tabBarStyle: {
                            backgroundColor: isDark ? '#000' : '#fff',
                            overflow: 'visible',
                            elevation: 1,
                            shadowColor: 'transparent',
                            paddingBottom: 2
                        },
                        tabBarItemStyle: {
                            height: 40,
                        },
                        tabBarIndicatorStyle: {
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: isDark ? '#fff' : '#000',
                        },
                        tabBarLabelStyle: {
                            fontWeight: 'bold',
                            fontSize: 14,
                            textTransform: 'lowercase',
                        },
                        tabBarActiveTintColor: isDark ? '#fff' : '#000',
                        tabBarInactiveTintColor: isDark ? '#666' : '#999',

                    }}>
                    {/* Add more screens here if they exist */}
                    <MaterialTopTabs.Screen name="index" options={{ tabBarIcon: ({ color }) => <Ionicons name="grid" size={20} color={color} />, tabBarLabelStyle: { display: "none" } }} />
                </MaterialTopTabs>
            </SafeAreaView>
        </ProfileRefreshContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'red',
    }
});