import AppBar from '@/Components/AppBar';
import { MaterialTopTabs } from '@/Components/TopBar/materialtopbars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme, Platform } from 'react-native';


export default function TopBarNavigation() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    if (Platform.OS === 'ios') {
        return (
            <SafeAreaView style={{ flex: 1 }} className={`${isDark ? 'bg-black' : 'bg-white'}`}  edges={['top']}>
                <AppBar title="Agora" />
                <MaterialTopTabs
                    screenOptions={{
                        tabBarStyle: {
                            backgroundColor: isDark ? '#000' : '#fff',
                            overflow: 'visible',
                            elevation: 1,
                            shadowColor: '',
                            paddingBottom: 2
                            // borderBottomWidth: 1,
                            // borderTopWidth: 1,

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
                            fontSize: 16,
                        },
                        tabBarActiveTintColor: isDark ? '#fff' : '#000',
                        tabBarInactiveTintColor: isDark ? '#eee' : '#000',

                    }}>
                    <MaterialTopTabs.Screen name="foryou" options={{ title: "Para ti" }} />
                    <MaterialTopTabs.Screen name="follows" options={{ title: "Siguiendo" }} />
                </MaterialTopTabs>
            </SafeAreaView>
        );
    }
        return (
            <SafeAreaView style={{ flex: 1 }} className={`${isDark ? 'bg-black' : 'bg-white'}`} edges={['top']}>
                <AppBar title="Agora" />
                <MaterialTopTabs
                    screenOptions={{
                        tabBarStyle: {
                            backgroundColor: isDark ? '#000' : '#fff',
                            overflow: 'hidden',
                            elevation: 1,
                            shadowColor: '',
                            paddingBottom: 2
                            // borderBottomWidth: 1,
                            // borderTopWidth: 1,

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
                            fontSize: 16,
                        },
                        tabBarActiveTintColor: isDark ? '#fff' : '#000',
                        tabBarInactiveTintColor: isDark ? '#eee' : '#000',

                    }}>
                    <MaterialTopTabs.Screen name="foryou" options={{ title: "Para ti" }} />
                    <MaterialTopTabs.Screen name="follows" options={{ title: "Siguiendo" }} />
                </MaterialTopTabs>
            </SafeAreaView>
        );
}