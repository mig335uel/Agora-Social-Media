import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text, TouchableOpacity, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";


import { Usuario } from "../Types/Users";
import { GlassView } from "expo-glass-effect";
import UserAvatar from "./UserAvatar";

export default function AppBar({ title }: { title: string }) {

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const usuario = useAuth();
    return (
        <>


            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 2, alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 5}}>
                <UserAvatar />
                <Text className={isDark ? 'text-white' : 'text-black'} style={{ fontSize: 20, fontWeight: 'bold', alignSelf: 'center', alignItems: 'center' }}>{title}</Text>
                <Image source={require('../../assets/AgorasLogo.png')} style={{ width: 30, height: 30 }} />
            </View>


        </>

    );


}