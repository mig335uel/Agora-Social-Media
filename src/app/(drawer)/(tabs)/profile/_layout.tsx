import React, { useCallback, useState } from "react";
import { View, StyleSheet, useColorScheme, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, MaterialTabBar } from "react-native-collapsible-tab-view";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import useAuth from "@/hooks/useAuth";
import { ProfileRefreshContext } from "../../../../Controller/_context";
import { MaterialTopTabs } from "@/Components/TopBar/materialtopbars";

export default function ProfileLayout() {
    const user = useAuth();
    const isDark = useColorScheme() === 'dark';
    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    // Solo para iOS: Definición de la cabecera colapsable
    const renderHeader = useCallback(() => {
        return (
            <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <View>

                    <ProfileAppBar user={user || undefined} isMe={true} />
                    <ProfileHeader user={user || undefined} isMe={true} />
                </View>
            </View>
        );
    }, [isDark, user]);

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