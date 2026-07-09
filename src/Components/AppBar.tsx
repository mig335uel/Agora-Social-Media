import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, Platform, Image, useColorScheme, TouchableNativeFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";


import { Usuario } from "../Types/Users";
import { GlassView } from "expo-glass-effect";
import UserAvatar from "./UserAvatar";
import { router } from "expo-router";

export default function AppBar({ title }: { title: string }) {

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const usuario = useAuth();

    if (Platform.OS === 'ios') {

        return (
            <>


                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 2, alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 5 }}>
                    <UserAvatar />
                    <Text className={isDark ? 'text-white' : 'text-black'} style={{ fontSize: 20, fontWeight: 'bold', alignSelf: 'center', alignItems: 'center' }}>{title}</Text>
                    <TouchableOpacity onPress={() => router.push('/(drawer)/messaging')} activeOpacity={0.8}>
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle="regular"
                            style={{ borderRadius: 9999999, padding: 10 }}
                            className="rounded-full"

                        >


                            <Ionicons name="chatbubble" size={24} color={isDark ? '#fff' : '#000'} />
                        </GlassView>
                    </TouchableOpacity>

                </View>


            </>

        );
    } else {
        return (
            <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 2, alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 5 }}>
                    <UserAvatar />
                    <Text className={isDark ? 'text-white' : 'text-black'} style={{ fontSize: 20, fontWeight: 'bold', alignSelf: 'center', alignItems: 'center' }}>{title}</Text>
                    <TouchableOpacity onPress={() => router.push('/(drawer)/messaging')}>
                        <View
                            
                            style={{ borderRadius: 9999999, padding: 10 }}
                            

                        >


                            <Ionicons name="chatbubble" size={24} color={isDark ? '#fff' : '#000'} />
                        </View>
                    </TouchableOpacity>

                </View>
            </>
        );
    }


}