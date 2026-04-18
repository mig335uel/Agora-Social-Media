# Arquitectura de Mensajería E2EE en Agora

Este documento explica paso a paso cómo funciona el sistema de mensajería con cifrado de extremo a extremo (E2EE) implementado en `MessageService.ts` y su integración con el **Búnker Nativo**.

---

## 1. Creación de un Chat (`createChat`)
Este flujo ocurre cuando seleccionas a un contacto por primera vez.

1.  **Detección de Chat Existente**: Se comprueba en `chat_participants` si ya existe una conversación previa. Si existe, se devuelve el `chat_id` actual.
2.  **Verificación de Seguimiento (Follows)**:
    *   Si el seguimiento es **mutuo**, el chat se marca como `direct`.
    *   Si **no es mutuo**, se crea el chat pero se genera una entrada en `chat_requests`. El receptor deberá aceptar la "solicitud de chat" para que el chat aparezca en su bandeja principal.
3.  **Generación de la Llave Maestra (AES)**:
    *   Se solicita al **Búnker Nativo** (`generarLlaveAESR`) crear una llave simétrica de 256 bits. Esta llave nunca sale del dispositivo en texto plano.
4.  **Distribución Segura de Llaves (RSA)**:
    *   Buscamos todos los dispositivos registrados del emisor y el receptor.
    *   Por cada dispositivo, descargamos su `public_device_key` (RSA).
    *   El Búnker cifra la llave AES con cada llave RSA pública.
    *   Se guardan en la tabla `chat_encripted_key`. Esto garantiza que **solo** esos dispositivos físicos podrán leer los mensajes del chat.

---

## 2. Envío de Mensajes (`sendMessage`)
Cuando el usuario presiona "Enviar" en la interfaz.

1.  **Obtención de Llave AES**:
    *   Si la llave no está en la caché (`aesKeyCache`), se descarga la versión cifrada de la BD y el Búnker la descifra usando la RSA privada guardada en el **Secure Enclave / KeyStore**.
2.  **Cifrado del Texto**:
    *   El texto se envía al Búnker (`encriptarMensajeTextoR`).
    *   El Búnker devuelve un paquete: `IV` (Vector de Inicialización) + `Ciphertext` (Mensaje cifrado). Ambos en base64.
3.  **Persistencia**:
    *   Se inserta en `chat_content` con el formato `iv:contenido`. Esto es lo único que ve Supabase (ruido ilegible).

---

## 3. Recepción y Lectura (`getMessages` / `getInbox`)
Cómo se transforman los datos de la BD en texto legible.

1.  **Carga de Datos**: Se descargan los mensajes cifrados de `chat_content`.
2.  **Descifrado on-the-fly**:
    *   El servicio separa el `IV` del `Ciphertext`.
    *   Se pasan al Búnker (`descifrarMensajeTextoR`).
    *   El motor nativo (AES-GCM) usa la llave del chat para recuperar el texto original.
3.  **Renderizado**: React Native recibe el texto plano y lo muestra en las burbujas de chat.

---

## 4. Sincronización en Tiempo Real
Para que la app se sienta viva sin refrescar.

*   **Mensajes**: Se usa `supabase.channel` para escuchar nuevos inserts en el `chat_id` actual.
*   **Llaves**: Un listener global en el layout detecta si alguien nos ha incluido en un nuevo chat (`chat_encripted_key`) y prepara el Búnker automáticamente.

---

## 🔐 Pilares de Seguridad
*   **Zero Knowledge**: El servidor (Supabase) nunca conoce la llave AES ni el contenido del mensaje.
*   **Hardware-Backed**: Las llaves RSA privadas nunca salen del chip de seguridad del teléfono.
*   **Multi-Dispositivo**: Al cifrar la llave del chat para cada dispositivo registrado, puedes leer tus mensajes tanto en tu iPhone como en tu Android simultáneamente.
