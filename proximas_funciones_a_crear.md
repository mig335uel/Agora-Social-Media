# Análisis de Funcionalidades Faltantes - Agora Social Media (Actualizado)

Este documento detalla las características pendientes de implementar en la arquitectura de Agora, teniendo en cuenta las limitaciones de almacenamiento (1 GB en Supabase) y los objetivos de seguridad (E2EE).

## 1. Flujo de Cuentas Privadas (Prioridad Alta)
Puesto que la tabla/lógica base de `follow_requests` ya existe en Supabase, falta conectar el ecosistema completo para que sea funcional:

* **UI de Solicitudes:** Una nueva pestaña en la pantalla de Notificaciones (o un apartado dedicado) para listar las solicitudes de seguimiento entrantes con botones de "Aceptar" y "Rechazar".
* **Servicio `UserService.ts`:** Funciones para `acceptFollowRequest` y `rejectFollowRequest` que muevan el registro de `follow_requests` a `follows` de forma atómica.
* **Filtrado de Feeds y Perfiles:** * Actualizar `getUserPosts` para que devuelva un array vacío o un error si el `targetUserId` es privado y el `currentUser` no es un seguidor aprobado.
    * Asegurar que `combine_feed_and_viral` (RPC) excluya absolutamente los posts de cuentas privadas para usuarios que no los siguen.
* **Estado del Botón Seguir:** El botón en `ProfileHeader.tsx` debe tener 3 estados: "Seguir", "Pendiente" (solicitud enviada) y "Siguiendo".

## 2. Mensajería Directa E2EE (El gran reto)
Implementar cifrado de extremo a extremo cambiará la forma en la que interactúas con Supabase, ya que el servidor no sabrá qué dicen los mensajes.

* **Gestión de Claves (Key Exchange):** * Necesitarás generar un par de claves (Pública/Privada) en el dispositivo local la primera vez que el usuario use los DMs (ej. usando `libsodium` o la Web Crypto API si usas React Native con polyfills).
    * La **Clave Pública** se sube a Supabase (ej. en una tabla `user_keys`).
    * La **Clave Privada** se guarda de forma segura en el dispositivo usando `expo-secure-store`.
* **Tablas de Mensajería:** Tabla `conversations` (para relacionar a los 2 usuarios) y `messages` (donde el `content` será un string cifrado ininteligible para Supabase).
* **Sincronización Multi-dispositivo (Opcional pero recomendado):** Si el usuario inicia sesión en otro móvil, no podrá leer sus mensajes anteriores a menos que implementes un sistema de respaldo de claves privadas (muy complejo) o limites el historial al dispositivo actual.
* **Notificaciones Push Cifradas:** En `NotificationService.ts`, las notificaciones de nuevos DMs no podrán incluir el contenido del mensaje, solo alertas genéricas como *"Tienes un nuevo mensaje de @usuario"*, a menos que la app lo descifre en segundo plano (requiere extensiones nativas).

## 3. Optimizaciones de Storage (Alternativas al Video)
Con 1 GB de límite, el video es inviable, pero hay otras formas de enriquecer el contenido consumiendo muy pocos bytes:

* **Compresión Agresiva de Imágenes:** Antes de subir cualquier imagen a `media_feature`, implementa `expo-image-manipulator` en el frontend para redimensionar (ej. max 1080x1080) y bajar la calidad JPEG al 70-80%. Esto reduce imágenes de 5MB a ~200KB.
* **Notas de Voz (Audio muy comprimido):** Los audios en formato Opus/AAC consumen poquísimo espacio (aprox. 15-30 KB por segundo). Podrías permitir notas de voz en los posts o respuestas sin castigar tu cuota de Supabase.
* **Encuestas (Polls) Nativas:** Las encuestas generan mucha interacción y cuestan literalmente 0 bytes de almacenamiento de archivos, ya que son solo registros en base de datos (texto plano y contadores).
* **Previsualización de Enlaces (Link Fetching):** Permitir que si un usuario pega una URL de YouTube, Spotify o una web, el post muestre una tarjeta con la imagen y título de ese link (usando un microservicio o Edge Function para parsear los Meta Tags OpenGraph).

## 4. Retención y Mecánicas de Interacción
Añadidos ligeros en base de datos que mejoran mucho el "engagement":

* **Guardados (Bookmarks):** Tabla `bookmarks` (user_id, post_id). Permitir a la gente guardar hilos interesantes.
* **Impresiones (Views):** Contar cuánta gente "ha visto" un post (idealmente sumando a un contador al hacer render en el `FlatList`).
* **Borradores (Drafts):** Guardar posts sin terminar en el almacenamiento local del dispositivo (`AsyncStorage` o SQLite local) para no gastar base de datos de Supabase.

## 5. Moderación (Crítico para las tiendas de apps)
Para que Apple y Google aprueben la app, es obligatorio tener:

* **Bloqueo de Usuarios:** Tabla `blocks` (blocker_id, blocked_id). El backend debe filtrar todas las consultas para que estas dos personas desaparezcan mutuamente de la red.
* **Silenciar (Mute):** Ocultar contenido sin bloquear (filtro local o en la query de `FeedService.ts`).