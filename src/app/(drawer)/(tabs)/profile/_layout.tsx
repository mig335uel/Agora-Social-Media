import React, { useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot } from "expo-router";
import { ProfileRefreshContext } from "@/Controller/_context";

export default function ProfileLayout() {
    const isDark = useColorScheme() === 'dark';
    const [refreshStatsFn, setRefreshStatsFn] = useState<() => Promise<void>>(() => async () => { });

    return (
        <ProfileRefreshContext.Provider value={{ refreshStats: refreshStatsFn, setRefreshStats: setRefreshStatsFn }}>
            <SafeAreaView style={{ flex: 1 }} className={isDark ? 'bg-black' : 'bg-white'} edges={['top']}>
                <Slot />
            </SafeAreaView>
        </ProfileRefreshContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }
});