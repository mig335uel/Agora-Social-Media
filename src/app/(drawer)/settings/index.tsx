import { View, Text, useColorScheme } from "react-native";



export default function SettingsScreen(){
    const isDark = useColorScheme() === 'dark';
    return (<View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>Ajustes</Text>
    </View>);
}