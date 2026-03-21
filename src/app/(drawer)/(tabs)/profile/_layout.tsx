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
import { Tabs, MaterialTabBar } from "react-native-collapsible-tab-view";
import { Slot } from "expo-router";


export default function ProfileLayout() {
    const user = useAuth();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    const renderHeader = () => {
        return (
            <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <ProfileAppBar user={user || undefined} />
                <ProfileHeader user={user || undefined} />
            </View>
        );
    };

    return (
        <ProfileRefreshContext.Provider value={{ refreshStats: refreshStatsFn, setRefreshStats: setRefreshStatsFn }}>
            <SafeAreaView style={{ flex: 1 }} className={`${isDark ? 'bg-black' : 'bg-white'}`} edges={['top']}>
                <Tabs.Container
                    renderHeader={renderHeader}
                    renderTabBar={(props) => (
                        <MaterialTabBar 
                            {...props} 
                            style={{ 
                                backgroundColor: isDark ? '#000' : '#fff',
                                elevation: 0,
                                shadowColor: 'transparent',
                                borderBottomColor: isDark ? '#333' : '#eee',
                                paddingBottom: 10
                            }}
                            contentContainerStyle={{ justifyContent: 'center' }}
                            tabStyle={{ height: 48, paddingBottom: 12 }}
                            indicatorStyle={{ 
                                backgroundColor: isDark ? '#fff' : '#000', 
                                height: 2,
                            }}
                            activeColor={isDark ? '#fff' : '#000'}
                            inactiveColor={isDark ? '#888' : '#aaa'}
                            labelStyle={{ fontWeight: 'bold', fontSize: 13, textTransform: 'lowercase' }}
                        />
                    )}
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
        backgroundColor: 'red',
    }
});