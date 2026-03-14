import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Para el efecto de transparencia en iOS
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1D9BF0', // Azul tipo Twitter/Pulse
        tabBarInactiveTintColor: '#8899A6',
        tabBarStyle: {
          position: 'absolute', // Hace que el menú "flote" sobre el contenido
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#000',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarBackground: () => 
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={{ flex: 1 }} />
          ) : null,
        headerStyle: { backgroundColor: '#000' },
        headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Muro',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* Agrega aquí más pestañas como "Buscar" o "Notificaciones" */}
    </Tabs>
  );
}