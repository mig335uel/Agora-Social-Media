import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from "../lib/supbase/supabase";
import { E2EEService } from './E2EEService';
import { NativeModules } from 'react-native';

const { AgoraBunker } = NativeModules;

/**
 * Solicita permisos de notificación y obtiene el Expo Push Token.
 */
export async function requestNotificationPermission() {
  console.log("--- Iniciando requestNotificationPermission (Expo SDK) ---");

  if (!Device.isDevice) {
    console.log('DEBUG: No es un dispositivo físico. Saltando permiso.');
    return null;
  }

  // Configurar canal para Android (Requerido para Android 8.0+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 1. Permisos para Android 13+ y iOS
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log("DEBUG: Permiso denegado.");
    Alert.alert('Permiso denegado', 'Activa las notificaciones en ajustes.');
    return null;
  }

  // 2. Obtener Token FCM (Firebase Cloud Messaging)
  try {
    // @ts-ignore - Algunas versiones de tipos de expo-notifications no incluyen projectId, pero es válido en runtime.
    const token = (await Notifications.getDevicePushTokenAsync({
      projectId: "5daba5d2-4908-419a-9034-2e3ea691e59f"
    })).data;
    console.log("DEBUG: Token FCM obtenido:", token);
    return token;
  } catch (error: any) {
    console.warn("DEBUG: No se pudo obtener el token oficial:", error.message);
    // BYPASS PARA DESARROLLO: Generamos un token sintético para no bloquear el registro del Búnker/RSA
    const dummyToken = `BUNKER_FREE_ACCOUNT_${Device.osBuildId || Math.random().toString(36).substring(7)}`;
    console.log("DEBUG: Usando Token de Emergencia para registrar hardware:", dummyToken);
    return dummyToken;
  }
}

/**
 * Registra el dispositivo en Supabase.
 */
export async function saveDeviceToken(userId: string, token: string) {
  try {
     // 1. Identificador nativo (Sin parches de UUID, Supabase generará el ID aleatorio)
     const myDeviceIdentifier = Device.osBuildId || 'Unknown';
    
     // 2. LIMPIEZA AGRESIVA
     await supabase
       .from('devices')
       .delete()
       .or(`fcm_token.eq."${token}",and(user_id.eq."${userId}",device_identifier.eq."${myDeviceIdentifier}")`);

     // 3. ACTIVACIÓN DEL BÚNKER E2EE
     await E2EEService.vincularHardwareConMiCuenta(myDeviceIdentifier, userId, token);
     
     // Complemento opcional: Puedes guardar también el device_name / last_seen modificando 
     // el código del AgoraBunkerModule de Kotlin después, por ahora esto certifica el aparato.
     console.log("✅ Búnker E2EE Inicializado y Token registrado para:", userId);

  } catch (err) {
    console.error("❌ Error inesperado forjando hardware en saveDeviceToken:", err);
  }
}

/**
 * Elimina el registro del dispositivo actual de Supabase al cerrar sesión.
 */
export async function unregisterDevice() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const myDeviceIdentifier = Device.osBuildId || 'Unknown';

    console.log("🗑️ Desvinculando hardware:", myDeviceIdentifier);

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('user_id', user.id)
      .eq('device_identifier', myDeviceIdentifier);

    if (error) throw error;
    console.log("✅ Hardware desvinculado con éxito.");
  } catch (e) {
    console.warn("⚠️ No se pudo desvincular el hardware (posiblemente ya borrado):", e);
  }
}

/**
 * =========================================================================
 * EL ESCUDO INTERCEPTOR (Lectura de Notificaciones Cifradas)
 * =========================================================================
 * Iniciar este escuchador en tu Layout principal. Desencripta onTheFly
 */
export function activarInterceptacionDecodificadora() {
  // Manejador que decide mostrar la notificación aunque estemos en la app
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

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
        } catch(e) {
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