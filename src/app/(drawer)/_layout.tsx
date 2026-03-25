import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/Components/CustomDrawerContent';
import { Octicons } from '@expo/vector-icons';
import { requestNotificationPermission, saveDeviceToken } from '@/Services/NotificacitonService';
import useAuth from '@/hooks/useAuth';

export default function DrawerLayout() {

  useEffect(() => {
    // 1. Creamos una función asíncrona dentro del useEffect
    const setupNotifications = async () => {
      try {
        // 2. Obtenemos el usuario actual de la sesión
        const user = useAuth();
        
        if (user) {
          // 3. Ponemos 'await' para esperar a que se genere el token real
          const token = await requestNotificationPermission();
          
          if (token) {
            // 4. Le pasamos el ID del usuario Y el token a tu función
            await saveDeviceToken(user.id, token);
          }
        }
      } catch (error) {
        console.error("Error configurando notificaciones:", error);
      }
    };

    // 5. Ejecutamos la función
    setupNotifications();
  }, []);
  return (
    
    <Drawer
     drawerContent={(props) => <CustomDrawerContent {...props} />} 
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        swipeEdgeWidth: 40,
        overlayColor: 'rgba(0,0,0,0.35)',
      }}
    >

      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
      <Drawer.Screen
        name="post"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
      <Drawer.Screen
        name="editar"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
    </Drawer>
  );
}
