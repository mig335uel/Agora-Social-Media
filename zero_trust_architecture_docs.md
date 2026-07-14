# Documentación: Arquitectura Zero-Trust E2EE en Agora

Esta guía explica de forma clara y sencilla el rediseño que hemos hecho en el sistema de mensajería para solucionar el problema de la pérdida de claves al reiniciar la app, implementando lo que llamamos **"Opción B" o "Arquitectura Zero-Trust"**.

---

## 🎯 El Problema Anterior

En la versión anterior del código, el ciclo de vida de las llaves funcionaba así:
1. El servidor (Supabase) enviaba un **candado** (la llave del chat cifrada con la llave pública RSA de tu dispositivo).
2. TypeScript (la capa de React Native) cogía ese candado y se lo mandaba a los módulos Nativos (Swift / Kotlin) para que lo abrieran.
3. El módulo nativo devolvía a TypeScript la llave AES "cruda" en texto claro (Base64).
4. TypeScript **almacenaba la llave AES en una variable de memoria RAM (`aesKeyCache`)**.
5. Cuando cerrabas la aplicación desde las apps recientes, **la memoria RAM se borraba y la llave AES se perdía**.
6. Al volver a abrir la app, si TypeScript no pedía el candado de nuevo a Supabase, no tenía forma de desencriptar los mensajes, mostrando "mensaje cifrado".

> [!WARNING]
> La solución "rápida" era guardar esa llave AES en texto plano usando `expo-secure-store` en TypeScript. Pero extraer una llave descifrada hacia la capa de Javascript introduce riesgos graves de seguridad (se puede robar a nivel de memoria o debugger).

---

## 🛡️ La Nueva Solución (Zero-Trust Búnker)

En lugar de que TypeScript gestione o vea la llave, hemos convertido los módulos nativos (`AgoraBunkerModule` en Android/iOS) en **Búnkeres Autónomos y Seguros**. 

**Regla de Oro:** TypeScript nunca toca, no ve, y no sabe cuál es la llave AES del chat. Solo conoce el **ID del Chat**.

### 1. El Nuevo Flujo (Al entrar a un chat)
1. TypeScript le dice al Búnker Nativo: *"Descifra este mensaje que pertenece al chat `12345`"*.
2. El Búnker Nativo busca en su **propio disco encriptado de hardware** si ya tiene la llave guardada para el chat `12345`.
3. **Si NO la tiene:** El Búnker da error. TypeScript entonces va a Supabase, se descarga el candado RSA y le dice al Búnker: *"Toma, ábrelo y guárdate lo que haya dentro bajo el nombre `12345`"*. El búnker obedece, la guarda permanentemente, y a partir de ahí ya sabe desencriptar.
4. **Si SÍ la tiene (o porque la acabamos de guardar o porque quedó de una sesión anterior):** El búnker desencripta el mensaje en sus tripas y le devuelve a TypeScript **solamente el texto plano**.

---

## 🧩 ¿Cómo guarda las llaves cada sistema operativo?

Para que las llaves sobrevivan al reiniciar la app (matarla de las apps recientes), hemos implementado almacenamiento permanente y ultra-seguro a nivel de Sistema Operativo:

### 🤖 Android (`AgoraKeyManager.kt`)
En Android, el Búnker guarda las llaves del chat usando **`EncryptedSharedPreferences`**. 
- Esta es una bóveda especial de Android que encripta todos los archivos en disco automáticamente.
- La "llave maestra" que bloquea esa bóveda se guarda en el **Android Keystore (TEE - Entorno de Ejecución Confiable)**. 
- Ni siquiera siendo root puedes extraer la Master Key de ahí, lo que significa que el disco del Búnker es impenetrable para otras apps.

### 🍏 iOS (`AgoraKeyManager.swift`)
En iOS, el Búnker utiliza el **`Keychain`** de Apple.
- Hemos creado una política llamada `kSecClassGenericPassword` donde cada contraseña se guarda con un prefijo del estilo: `com.antihodio.agora.chat.12345`.
- Se guarda bajo la estricta política `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, que significa que la llave no viaja a iCloud y solo es legible por la CPU cuando el iPhone está desbloqueado.

---

## 🛠️ ¿Qué ha cambiado en el código? (Resumen para no volverte loco)

### Capa Nativa (Kotlin y Swift)
- He borrado los métodos "Stateless" (sin memoria) antiguos: `descifrarLlaveDeChatR` y `generarLlaveAESR`.
- He añadido los nuevos métodos "Stateful" (con memoria): 
  - `generarLlaveAESParaChat(chatId)`
  - `descifrarYGuardarLlaveDeChat(chatId, candadoBase64)`
  - `cifrarMensajeTextoConChat(chatId, textoPlano)`
  - `descifrarMensajeTextoConChat(chatId, textoCifrado)`
  - Todos estos métodos consultan a `AgoraKeyManager` para acceder al disco duro antes de operar.

### Capa de Javascript (`MessageService.ts`)
- Hemos eliminado por completo el `Map` llamado `aesKeyCache` que causaba la amnesia de las llaves al cerrar la app.
- Hemos cambiado la forma en que se envían los mensajes: ahora, en vez de mandar la llave en la función de cifrar, **mandamos el `chat_id`**.
- Hemos creado la función `asegurarLlaveEnBunker()`, que se encarga de probar si el Búnker tiene la llave localmente. Si no la tiene (por ejemplo, es la primera vez que chateas desde ese móvil o has desinstalado la app), va al servidor, pide el candado y se lo inyecta al búnker.

---

## 🚀 Conclusión

Esta arquitectura **Zero-Trust** es cómo operan WhatsApp o Signal. El código de la interfaz visual (React Native) actúa simplemente como un mensajero tonto que lleva los mensajes cifrados a una caja fuerte sellada a nivel de hardware (El Búnker). La caja fuerte hace la magia dentro y le escupe a la pantalla el texto legible, y viceversa.

¡Cuando puedas probarlo, verás que puedes matar la aplicación todo lo que quieras y los mensajes ya siempre aparecerán descifrados mágicamente al volver a entrar!
