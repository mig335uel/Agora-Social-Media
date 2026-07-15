import { View, Text, useColorScheme, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import TitleSupport from "@/Services/TitleSupport";
import { useCallback } from "react";
import * as Device from 'expo-device';

export default function ActiveSessionsScreen() {
    const isDark = useColorScheme() === 'dark';

    useFocusEffect(
        useCallback(() => {
            TitleSupport.setTitle("Sesiones activas");
        }, [])
    );

    const handleRevokeSession = (deviceName: string) => {
        Alert.alert(
            "Cerrar sesión",
            `¿Estás seguro de que deseas cerrar la sesión en ${deviceName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Cerrar sesión", 
                    style: "destructive",
                    onPress: () => {
                        Alert.alert("Éxito", `Se ha cerrado la sesión en ${deviceName}.`);
                    }
                }
            ]
        );
    };

    return (
        <ScrollView className={`flex-1 ${isDark ? 'bg-black' : 'bg-[#f9fafb]'}`}>
            <View className="pb-10 pt-2">
                <Text className={`text-sm mb-4 mx-4 mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aquí puedes ver los dispositivos que han iniciado sesión en tu cuenta de Agora. Cierra la sesión en aquellos que no reconozcas.
                </Text>

                <Text className={`text-xs font-bold uppercase tracking-wider ml-4 mt-6 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Dispositivo actual
                </Text>
                
                <View className={`flex-row items-center p-4 border-b ${isDark ? 'border-gray-800/60 bg-black/50' : 'border-gray-100 bg-white'}`}>
                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <Ionicons 
                            name={Platform.OS === 'ios' ? "logo-apple" : "logo-android"} 
                            size={24} 
                            color={isDark ? '#e5e7eb' : '#374151'} 
                        />
                    </View>
                    <View className="flex-1">
                        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                            {Device.deviceName || Device.modelName || "Este dispositivo"}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            Conectado ahora mismo
                        </Text>
                    </View>
                </View>

                {/* En el futuro aquí se cargarían las sesiones reales desde la tabla devices de Supabase */}
                
            </View>
        </ScrollView>
    );
}
