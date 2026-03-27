import { View, TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileCustomTabBar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#000' : '#fff';
    const activeColor = isDark ? '#fff' : '#000';
    const inactiveColor = isDark ? '#888' : '#aaa';

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <TouchableOpacity
                style={styles.tab}
                onPress={() => onTabChange("posts")}
                activeOpacity={0.7}
            >
                <Ionicons
                    name="grid"
                    size={22}
                    color={activeTab === "posts" ? activeColor : inactiveColor}
                />
                {activeTab === "posts" && (
                    <View style={[styles.indicator, { backgroundColor: activeColor }]} />
                )}
            </TouchableOpacity>
            
            {/* Future tabs (e.g. likes, media) can be added here */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 48,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.2)',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        width: 60,
        borderRadius: 1,
    }
});
