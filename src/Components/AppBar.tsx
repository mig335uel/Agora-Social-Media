import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";


import { Usuario } from "../Types/Users";
import { GlassView } from "expo-glass-effect";

export default function AppBar({ title }: { title: string }) {

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const usuario = useAuth();

    const isiOS = Platform.OS === 'ios';
    return (
        <>

            {isiOS ? (
                <GlassView>
                    <View className={`flex-2 flex-row  space-between ${isDark ? 'bg-black' : 'bg-white'}`}>
                        <Text className={`text-2xl font-bold  ${isDark ? 'text-white' : 'text-black'}`}>{title}</Text>
                    </View>
                </GlassView>
            ) : (
                <View className={`flex-2 flex-row ${isDark ? 'bg-black' : 'bg-white'} `}>
                    <Text className={`text-2xl font-bold  ${isDark ? 'text-white' : 'text-black'}`}>{title}</Text>
                </View>
            )}
        </>

    );


}