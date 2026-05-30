import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import { supabase } from "../lib/supbase/supabase";
import { E2EEService } from './E2EEService';
import { NativeModules } from 'react-native';

const { AgoraBunker } = NativeModules;

/**
 * Solicita permisos de notificación y obtiene el token de push (APN en iOS, FCM en Android).
 * Si getDevicePushTokenAsync falla (red, configuración), devuelve un token de desarrollo
 * para no bloquear el registro del Búnker E2EE.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  console.log("--- Iniciando requestNotificationPermission ---");

  if (!Device.isDevice) {
    const simToken = `DEV_SIMULATOR_${Device.modelId || 'unknown'}`;
    console.log('Simulador detectado. Token de desarrollo:', simToken);
    return simToken;
  }

  // Canal de notificaciones para Android 8.0+
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Solicitar permiso al usuario
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    } catch (permError) {
      console.warn("⚠️ Error solicitando permiso:", permError);
    }
  }

  if (finalStatus !== 'granted') {
    console.log("Permiso de notificaciones denegado por el usuario.");
    Alert.alert(
      'Notificaciones desactivadas',
      'Para recibir mensajes activa las notificaciones en Ajustes.',
    );
    return null;
  }

  // Obtener el token APN (iOS) o FCM (Android)
  try {
    // @ts-ignore
    const token = (await Notifications.getDevicePushTokenAsync({
      projectId: "5daba5d2-4908-419a-9034-2e3ea691e59f"
    })).data;
    console.log("✅ Token push obtenido:", token);
    return token;
  } catch (error: any) {
    // Fallback: si falla el token real (configuración, red, etc.),
    // generamos un token de desarrollo para no bloquear el registro del Búnker E2EE.
    const devToken = `DEV_${Platform.OS.toUpperCase()}_${Device.osBuildId || Device.modelId || Date.now()}`;
    console.warn("⚠️ Token push no disponible. Usando token de desarrollo:", devToken, error.message);
    return devToken;
  }
}

/**
 * Registra el dispositivo en Supabase.
 */
export async function saveDeviceToken(userId: string, token: string) {
  try {
    let myDeviceIdentifier = await SecureStore.getItemAsync('agora_device_identifier');
    if (!myDeviceIdentifier) {
      // Generamos un ID único por instalación para evitar que modelos iguales compartan el ID
      myDeviceIdentifier = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    // Limpieza previa (fila duplicada por mismo token o mismo hardware exacto)
    await supabase
      .from('devices')
      .delete()
      .or(`fcm_token.eq."${token}",and(user_id.eq."${userId}",device_identifier.eq."${myDeviceIdentifier}")`);

    // Registro nativo (Kotlin/Swift) — pasa el identificador exacto
    await E2EEService.vincularHardwareConMiCuenta(myDeviceIdentifier, userId, token);

    // Persistimos el identifier de texto (para desregistro en logout)
    await SecureStore.setItemAsync('agora_device_identifier', myDeviceIdentifier);

    // ── Clave: obtener el UUID asignado por Postgres al row de devices ──────────
    // El UUID (devices.id) es lo que usa chat_encripted_key.device_id como FK.
    // El cliente nunca lo conoce antes de esta consulta.
    const { data: deviceRow } = await supabase
      .from('devices')
      .select('id')
      .eq('user_id', userId)
      .eq('device_identifier', myDeviceIdentifier)
      .maybeSingle();

    if (deviceRow?.id) {
      await SecureStore.setItemAsync('agora_device_db_id', deviceRow.id);
      console.log('✅ Búnker E2EE Inicializado. Device DB UUID guardado:', deviceRow.id);
    } else {
      console.warn('⚠️ No se pudo obtener el UUID del dispositivo de Supabase.');
    }

  } catch (err) {
    console.error('❌ Error inesperado forjando hardware en saveDeviceToken:', err);
  }
}

/**
 * Elimina el registro del dispositivo actual de Supabase al cerrar sesión.
 * - Android: usa el módulo nativo (apiKey del TEE + SSL Pinning).
 * - iOS: usa el cliente Supabase JS (URLProtocol inyecta la apiKey automáticamente).
 */
export async function unregisterDevice() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Leemos el identifier guardado al registrar (valor exacto que fue a Supabase)
    const storedIdentifier = await SecureStore.getItemAsync('agora_device_identifier');
    const myDeviceIdentifier = storedIdentifier || Device.osBuildId || Device.modelId || 'Unknown';

    console.log("🗑️ Desvinculando hardware:", myDeviceIdentifier, storedIdentifier ? "(SecureStore)" : "(fallback)");

    if (Platform.OS === 'android') {
      // Android: el nativo hace el DELETE con la apiKey real del TEE y SSL Pinning
      const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      await AgoraBunker.desregistrarDispositivo(
        myDeviceIdentifier,
        session.user.id,
        session.access_token,
        projectUrl
      );
    } else {
      // iOS: URLProtocol inyecta la apiKey automáticamente en el cliente Supabase
      // count: 'exact' + head: true para obtener el conteo real sin traer filas
      const { error, count } = await supabase
        .from('devices')
        .delete()
        .eq('user_id', session.user.id)
        .eq('device_identifier', myDeviceIdentifier)
      if (error) throw error;
      console.log(`✅ Hardware desvinculado (iOS). Filas eliminadas: ${count ?? 0}`);
    }

    // Limpiamos ambas claves del SecureStore tras el borrado
    await SecureStore.deleteItemAsync('agora_device_identifier');
    await SecureStore.deleteItemAsync('agora_device_db_id');

  } catch (e) {
    console.warn("⚠️ No se pudo desvincular el hardware:", e);
  }
}

/**
 * =========================================================================
 * EL ESCUDO INTERCEPTOR (Lectura de Notificaciones Cifradas)
 * =========================================================================
 * Iniciar este escuchador en tu Layout principal. Desencripta onTheFly
 */
export function activarInterceptacionDecodificadora() {
  // NOTA: El setNotificationHandler global está en _layout.tsx.
  // No lo redefinimos aquí para no sobreescribirlo y perder flags como shouldSetBadge.

  Notifications.addNotificationReceivedListener(async (notification) => {
    // Revisamos si el objeto 'data' trae la carga militar de tu servidor NodeJS
    const payloadExtra = notification.request.content.data as any;
    const { encrypted_content, encrypted_symmetric_key } = payloadExtra;

    if (encrypted_content && encrypted_symmetric_key) {
      try {
        console.log("🔒 Push Encriptado Detectado. Iniciando rotura de candado TEE...");
        // 1. Despertamos al TEE para romper la llave RSA
        const llaveAESBase64 = await AgoraBunker.descifrarLlaveDeChatR(encrypted_symmetric_key);

        // 2. Desencriptamos el texto final
        const mensajePlano = await AgoraBunker.descifrarMensajeTextoR(encrypted_content, llaveAESBase64);

        // 3. Mostramos la Notificación limpia y segura en pantalla 
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Mensaje Confidencial",
            body: mensajePlano
          },
          trigger: null // Disparador Inmediato
        });
        console.log("🔓 Push descifrado y mostrado exitosamente.");
      } catch (e) {
        console.error("❌ Catástrofe: No se pudo descifrar push:", e)
      }
    }
  });
}


export async function getNotifcations(userId: string) {
  if (!userId || userId === "undefined") return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*, users!sender_id(*)')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error obteniendo notificaciones:", error.message);
    return [];
  }

  return data;
}

/**
 * Marca todas las notificaciones no leídas de un usuario como leídas.
 * Se llama al abrir la pantalla de notificaciones para resetear el badge.
 */
export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error("Error marcando como leídas:", error.message);
  } else {
    // Sincronizar el badge del icono de la app a 0
    Notifications.setBadgeCountAsync(0);
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas y actualiza el badge del icono de la app.
 */
export async function updateAppBadge(userId: string) {
  if (!userId || userId === "undefined") return;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (!error && count !== null) {
    Notifications.setBadgeCountAsync(count);
  }
}