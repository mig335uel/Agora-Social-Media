import { View, Text, useColorScheme, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import useAuth from '@/hooks/useAuth';
import { signOut } from '@/Services/authService';
import TitleSupport from "@/Services/TitleSupport";

// Componente para los encabezados de sección
const SectionHeader = ({ title }: { title: string }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <Text className={`text-xs font-bold uppercase tracking-wider ml-4 mt-6 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {title}
        </Text>
    );
};

// Componente para cada opción del menú de ajustes
const SettingItem = ({ icon, title, subtitle, onPress, isDestructive = false }: any) => {
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

export default function SettingsScreen() {
    const isDark = useColorScheme() === 'dark';
    const currentUser = useAuth();
   
    const handleLogout = () => {
        Alert.alert(
            "Cerrar sesión",
            "¿Estás seguro de que quieres cerrar tu sesión en Agora?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Salir", 
                    style: "destructive",
                    onPress: async () => {
                        // Usamos el signOut centralizado para desvincular
                        // este dispositivo de la tabla 'devices' ANTES de cerrar sesión.
                        await signOut();
                    }
                }
            ]
        );
    };

    const handleComingSoon = (feature: string) => {
        Alert.alert(
            "Próximamente",
            `La función de ${feature} estará disponible en una futura actualización.`
        );
    };

    return (
        <ScrollView className={`flex-1 ${isDark ? 'bg-black' : 'bg-[#f9fafb]'}`}>
            <View className="pb-10 pt-2">
                
                <SectionHeader title="Tu Cuenta" />
                <SettingItem 
                    icon="person-outline" 
                    title="Editar Perfil" 
                    subtitle="Cambia tu foto, nombre o biografía"
                    onPress={() => {
                        if (currentUser?.id) {
                            router.push({ pathname: '/(drawer)/editar/[id]', params: { id: currentUser.id } });
                        } else {
                            Alert.alert("Cargando", "Por favor, espera un momento mientras obtenemos tus datos.");
                        }
                    }}
                />
                <SettingItem 
                    icon="shield-checkmark-outline" 
                    title="Seguridad" 
                    subtitle="Contraseña y métodos de acceso"
                    onPress={() => router.push("/(drawer)/settings/Security")}
                />

                <SectionHeader title="Preferencias" />
                <SettingItem 
                    icon="notifications-outline" 
                    title="Notificaciones" 
                    subtitle="Mensajes, likes y menciones"
                    onPress={() => handleComingSoon("Notificaciones")}
                />
                <SettingItem 
                    icon="moon-outline" 
                    title="Apariencia" 
                    subtitle="Modo oscuro automático"
                    onPress={() => handleComingSoon("Apariencia")}
                />
                <SettingItem 
                    icon="language-outline" 
                    title="Idioma" 
                    subtitle="Español"
                    onPress={() => handleComingSoon("Idioma")}
                />

                <SectionHeader title="Información y Soporte" />
                <SettingItem 
                    icon="help-buoy-outline" 
                    title="Ayuda y Soporte" 
                    onPress={() =>router.push('/(drawer)/settings/support')}
                />
                <SettingItem 
                    icon="document-text-outline" 
                    title="Términos y Privacidad" 
                    onPress={() =>router.push('/(drawer)/settings/privacy') as any}
                />
                <SettingItem 
                    icon="information-circle-outline" 
                    title="Acerca de Agora" 
                    subtitle="Versión 1.0.0 (Búnker Activo)"
                    onPress={() => handleComingSoon("Detalles de versión")}
                />

                <SectionHeader title="Acciones" />
                <SettingItem 
                    icon="log-out-outline" 
                    title="Cerrar Sesión" 
                    subtitle="Desconecta tu cuenta de este dispositivo"
                    isDestructive={true}
                    onPress={handleLogout}
                />

                {/* Espaciador final para dar respiro al ScrollView */}
                <View className="h-8" />
            </View>
        </ScrollView>
    );
}