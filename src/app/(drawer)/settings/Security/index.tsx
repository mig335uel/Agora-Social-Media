import { View, Text, useColorScheme, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import TitleSupport from "@/Services/TitleSupport";
import { useCallback } from "react";

// Componente para los encabezados de sección
const SectionHeader = ({ title }: { title: string }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <Text className={`text-xs font-bold uppercase tracking-wider ml-4 mt-6 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {title}
        </Text>
    );
};

// Componente para cada opción de seguridad
const SecurityItem = ({ icon, title, subtitle, onPress, isDestructive = false }: any) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-800/60 bg-black/50' : 'border-gray-100 bg-white'}`}
        >
            <View className="flex-row items-center flex-1">
                {/* Ícono envuelto en un círculo suave */}
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} ${isDestructive ? (isDark ? 'bg-red-900/30' : 'bg-red-100') : ''}`}>
                    <Ionicons 
                        name={icon} 
                        size={20} 
                        color={isDestructive ? '#ef4444' : (isDark ? '#e5e7eb' : '#374151')} 
                    />
                </View>

                {/* Textos */}
                <View className="flex-1">
                    <Text className={`text-base font-medium ${isDestructive ? 'text-red-500' : (isDark ? 'text-white' : 'text-black')}`}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {/* Flechita de navegación */}
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#4b5563' : '#9ca3af'} />
        </TouchableOpacity>
    );
};

export default function Security(){
    const isDark = useColorScheme() === "dark";

    useFocusEffect(
        useCallback(() => {
            TitleSupport.setTitle("Seguridad");
        }, [])
    );

    return (
        <ScrollView className={`flex-1 ${isDark ? 'bg-black' : 'bg-[#f9fafb]'}`}>
            <View className="pb-10 pt-2">
                <SectionHeader title="Controles de acceso" />
                <SecurityItem 
                    icon="finger-print-outline" 
                    title="Autenticación biométrica" 
                    subtitle="Usa Face ID o Touch ID para entrar"
                    onPress={() => console.log('Biometría')}
                />
                <SecurityItem 
                    icon="key-outline" 
                    title="Cambiar contraseña" 
                    subtitle="Actualiza tu clave de acceso"
                    onPress={() => console.log('Cambiar contraseña')}
                />
                
                <SectionHeader title="Dispositivos" />
                <SecurityItem 
                    icon="phone-portrait-outline" 
                    title="Sesiones activas" 
                    subtitle="Gestiona los dispositivos conectados"
                    onPress={() => console.log('Sesiones activas')}
                />

                <SectionHeader title="Datos" />
                <SecurityItem 
                    icon="trash-outline" 
                    title="Eliminar cuenta" 
                    subtitle="Borra permanentemente tu cuenta y datos"
                    isDestructive={true}
                    onPress={() => console.log('Eliminar cuenta')}
                />
            </View>
        </ScrollView>
    );
}