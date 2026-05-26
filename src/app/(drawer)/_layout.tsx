import React, { useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { type RealtimeChannel } from '@supabase/supabase-js';
import CustomDrawerContent from '@/Components/CustomDrawerContent';
import { requestNotificationPermission, saveDeviceToken } from '@/Services/NotificationService';
import { MessageService } from '@/Services/MessageService';
import { supabase } from '@/lib/supbase/supabase';
import useAuth from '@/hooks/useAuth';
import * as SecureStore from 'expo-secure-store';

const AgoraBunker = NativeModules.AgoraBunker || NativeModules.AgoraBunkerModule;

export default function DrawerLayout() {
  const user = useAuth();
  const keyDeliveryChannel = useRef<RealtimeChannel | null>(null);

  // ── Registro del dispositivo ya se hace en _layout.tsx (raíz) ──────────────
  // NO duplicar aquí: en iOS, una doble llamada a requestPermissionsAsync()
  // mientras el diálogo del sistema está abierto causa un deny automático.

  // ── Listener global de ENTREGA DE LLAVES E2EE ──────────────────────────────────────
  //
  // Cuando createChat() inserta una fila en chat_encripted_key con nuestro device_id,
  // este listener:
  //   1. La detecta al instante vía Realtime WebSocket
  //   2. Llama al Búnker nativo para descifrar la llave AES con nuestra RSA privada (TEE/Keychain)
  //   3. La guarda en el cache RAM → el chat ya está listo para recibir/enviar mensajes
  //
  useEffect(() => {
    if (!user) return;

    let retryCount = 0;
    const MAX_RETRIES = 5;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const subscribeToKeyDelivery = async () => {
      if (!isMounted) return;

      // Limpiar canal previo si existiera
      if (keyDeliveryChannel.current) {
        supabase.removeChannel(keyDeliveryChannel.current);
        keyDeliveryChannel.current = null;
      }

      // Obtener el UUID de devices.id (FK de chat_encripted_key.device_id)
      const myDbDeviceId = await SecureStore.getItemAsync('agora_device_db_id');

      if (!myDbDeviceId) {
        // El registro del dispositivo puede no haber terminado aún (carrera de condición)
        // Reintentar con backoff exponencial hasta MAX_RETRIES veces
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** retryCount, 30000); // max 30s
          retryCount++;
          console.warn(`[Búnker] agora_device_db_id no disponible. Reintento ${retryCount}/${MAX_RETRIES} en ${delay}ms...`);
          retryTimer = setTimeout(subscribeToKeyDelivery, delay);
        } else {
          console.error('[Búnker] No se pudo obtener agora_device_db_id tras múltiples intentos. Listener de llaves no iniciado.');
        }
        return;
      }

      if (!AgoraBunker) {
        console.warn('[Búnker] Módulo nativo no disponible — listener de llaves no iniciado.');
        return;
      }

      const cleanDbDeviceId = myDbDeviceId.trim();
      console.log(`[Búnker] Iniciando canal de entrega de llaves para device: ${cleanDbDeviceId.substring(0, 8)}...`);

      keyDeliveryChannel.current = supabase
        .channel(`key-delivery-${cleanDbDeviceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_encripted_key',
            filter: `device_id=eq.${cleanDbDeviceId}`,
          },
          async (payload) => {
            const { chat_id, encripted_key } = payload.new as {
              chat_id: string;
              encripted_key: string;
            };

            console.log(`[Búnker] 📦 Nueva llave de chat recibida para: ${chat_id}`);

            try {
              // Abrimos el candado RSA con la llave privada del TEE/Keychain
              // Devuelve la llave AES en Base64, ya disponible para AES-GCM
              const aesKeyBase64: string = await AgoraBunker.descifrarLlaveDeChatR(encripted_key);

              // Guardamos en el cache en RAM — el chat está listo al instante
              MessageService.precalentarLlave(chat_id, aesKeyBase64);

              console.log(`[Búnker] ✅ Llave del chat ${chat_id} descifrada y lista.`);
            } catch (e) {
              console.error(`[Búnker] ❌ Error descifrando llave del chat ${chat_id}:`, e);
            }
          },
        )
        .subscribe((status) => {
          console.log(`[Búnker] Canal de entrega de llaves: ${status}`);
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isMounted) {
            // Reconexion automática tras error transitorio
            console.warn('[Búnker] Error en canal de llaves — reconectando en 3s...');
            retryTimer = setTimeout(subscribeToKeyDelivery, 3000);
          }
        });
    };

    subscribeToKeyDelivery();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (keyDeliveryChannel.current) {
        supabase.removeChannel(keyDeliveryChannel.current);
        keyDeliveryChannel.current = null;
      }
    };
  }, [user]);

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
      <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="post" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="editar" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="messaging" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
