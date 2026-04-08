import { NativeModules, Platform } from 'react-native';
import { supabase } from '@/lib/supbase/supabase'; // Asegúrate que esta ruta a tu instancia de Supabase es correcta

// Extraemos el puente del Búnker (Mismo nombre en Android e iOS)
const AgoraBunker = NativeModules.AgoraBunker || NativeModules.AgoraBunkerModule;

export class E2EEService {
  
  /**
   * =======================================================
   * FASE 1: REGISTRO DEL DISPOSITIVO
   * =======================================================
   * Esto debes llamarlo JUSTO DESPUÉS de que el usuario inicie sesión, o en un useEffect principal.
   */
  static async vincularHardwareConMiCuenta(deviceId: string, userId: string, fcmToken: string = "") {
    if (!AgoraBunker) {
      console.warn("E2EE Búnker: Módulo nativo no encontrado.");
      return;
    }

    try {
      // 1. Validamos que tengamos sesión viva de JS
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) throw new Error("Amnesia de Sesión: Asegúrate de estar logueado.");
      
      const jwtToken = session.access_token;
      const dbUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "PUEDES_HARDCODEAR_TU_URL_AQUI.supabase.co";

      // 2. Encendemos los motores nativos (Llamada al Interceptor/Búnker).
      const status = await AgoraBunker.registrarMiDispositivo(deviceId, userId, jwtToken, fcmToken, dbUrl);
      
      console.log("E2EE Status:", status);
      return status;
      
    } catch (e) {
      console.error("Fallo inyectando la llave hardware:", e);
      throw e;
    }
  }

  /**
   * =======================================================
   * FASE 2: ORQUESTADOR DE CREACIÓN DE CHAT
   * =======================================================
   * Úsalo cuando un usuario le de al botón "Crear Grupo" o envíe su primer mensaje.
   * 
   * @param chatParticipants Array de UUIDs de usuarios (Ej: [miID, elIDDeMaría])
   * @param chatId El UUID del Chat recién generado.
   */
  static async forjarCandadosDeGrupo(chatParticipants: string[], chatId: string) {
    if (!AgoraBunker) return;

    try {
      // 1. RECOLECCIÓN DE LLAVES PÚBLICAS
      // Extraemos absolutamente todos los dispositivos registrados a esos usuarios.
      // Así si María tiene un móvil y una tablet, ambos reciben una copia de la llave para abrir el mensaje.
      const { data: dispositivos, error } = await supabase
        .from('devices')
        .select('id, public_device_key')
        .in('user_id', chatParticipants)
        .not('public_device_key', 'is', null);

      if (error) throw error;
      if (!dispositivos || dispositivos.length === 0) {
        console.warn("Advertencia: Se creó el chat, pero nadie tiene un Búnker de hardware inicializado.");
        return;
      }

      // Convertimos el array a String para mandárselo a la API Nativa
      const devicesJsonStr = JSON.stringify(dispositivos);

      // 2. TRABAJO SUCIO NATIVO (Kotlin Aes/RSA)
      // Kotlin nos devuelve: [{"device_id": "...", "encrypted_key": "..."}]
      const candadosSelladosStr = await AgoraBunker.generarLlavesGrupo(devicesJsonStr);
      const candadosSellados = JSON.parse(candadosSelladosStr);

      // 3. ADAPTACIÓN DE PAYLOAD
      // Formateamos los nombres para que tu Postgres no se queje (respetando tus columnas originales)
      const payloadSupabase = candadosSellados.map((item: any) => ({
        chat_id: chatId,
        device_id: item.device_id,
        encripted_key: item.encrypted_key // Escrito con 'i' siguiendo tu base de datos
      }));

      // 4. INSERCIÓN EN BASE DE DATOS
      const { error: insErr } = await supabase.from('chat_encripted_key').insert(payloadSupabase);
      if (insErr) throw insErr;

      console.log("🔒 Candados de grado militar forjados e insertados con éxito.");
      return true;

    } catch (e) {
       console.error("Catástrofe forjando llaves:", e);
       throw e;
    }
  }

}
