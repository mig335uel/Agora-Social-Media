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

  // ── Registro del dispositivo + token push ──────────────────────────────────
  useEffect(() => {
    const setupDevice = async () => {
      if (!user) return;
      try {
        const token = await requestNotificationPermission();
        if (token) await saveDeviceToken(user.id, token);
      } catch (error) {
        console.error('[DrawerLayout] Error configurando dispositivo:', error);
      }
    };
    setupDevice();
  }, [user]);

  // ── Listener global de ENTREGA DE LLAVES E2EE ─────────────────────────────
  //
  // Cuando createChat() inserta una fila en chat_encripted_key con nuestro device_id,
  // este listener:
  //   1. La detecta al instante vía Realtime WebSocket
  //   2. Llama al Búnker nativo para descifrar la llave AES con nuestra RSA privada (TEE/Keychain)
  //   3. La guarda en el cache RAM → el chat ya está listo para recibir/enviar mensajes
  //
  useEffect(() => {
    if (!user) return;

    const subscribeToKeyDelivery = async () => {
      // Usamos el UUID de devices.id (no el device_identifier) porque es la FK
      // que usa chat_encripted_key.device_id. Se guarda en SecureStore tras el registro.
      const myDbDeviceId = await SecureStore.getItemAsync('agora_device_db_id');
      if (!myDbDeviceId || !AgoraBunker) {
        console.warn('[Búnker] Sin device DB UUID o módulo nativo — listener de llaves no iniciado.');
        return;
      }

      keyDeliveryChannel.current = supabase
        .channel(`key-delivery:${myDbDeviceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_encripted_key',
            filter: `device_id=eq.${myDbDeviceId}`,
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
        });
    };

    subscribeToKeyDelivery();

    return () => {
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
      <Drawer.Screen name="post"   options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="editar" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="messaging" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
