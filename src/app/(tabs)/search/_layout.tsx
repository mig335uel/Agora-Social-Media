import AppBar from "@/Components/AppBar";
import AppSearchBar from "@/Components/AppSearchBar";
import { MaterialTopTabs } from "@/Components/TopBar/materialtopbars";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";




export default function SearchLayout() {
    
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} edges={['top']}>
            <AppSearchBar title="Buscar" />

            <MaterialTopTabs
                screenOptions={{
                    tabBarStyle: {
                        backgroundColor: isDark ? '#000' : '#fff',
                        overflow: 'visible',
                        elevation: 1,
                        shadowColor: '',
                        paddingBottom: 2,
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
                }}
            >
                <MaterialTopTabs.Screen name="index" options={{ title: 'Tendencias' }} />
            </MaterialTopTabs>
        </SafeAreaView>
    );



    
}