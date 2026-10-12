import { View, TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileCustomTabBar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#000' : '#fff';
    const activeColor = isDark ? '#fff' : '#000';
    const inactiveColor = isDark ? '#777' : '#999';

    const tabs = [
        { id: 'posts', label: 'Publicaciones', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'replies', label: 'Respuestas', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
        { id: 'likes', label: 'Me gusta', icon: 'heart-outline', activeIcon: 'heart' }
    ];

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabContent}>
                            <Ionicons
                                name={(isActive ? tab.activeIcon : tab.icon) as any}
                                size={17}
                                color={isActive ? activeColor : inactiveColor}
                            />
                            <Text style={[styles.tabLabel, { color: isActive ? activeColor : inactiveColor, fontWeight: isActive ? '700' : '500' }]}>
                                {tab.label}
                            </Text>
                        </View>
                        {isActive && (
                            <View style={[styles.indicator, { backgroundColor: activeColor }]} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 48,
        width: '100%',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.2)',
        marginTop: 6,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabLabel: {
        fontSize: 13,
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        height: 2.5,
        width: '60%',
        borderRadius: 2,
    }
});
