# Documentación Técnica - Mejoras en Interacciones y Feed

Se ha realizado una reingeniería completa del sistema de interacciones (Likes, Reposts, Shares) y de la carga de datos del feed para mejorar la fluidez (Zero-Latency UI) y la fiabilidad de los datos.

## 1. Backend: Funciones RPC (Supabase)

Se han creado funciones en PL/pgSQL para centralizar la lógica de negocio en la base de datos, garantizando atomicidad y activando automáticamente el algoritmo de viralidad.

### `toggle_like(p_post_id uuid)`
- **Lógica**: Comprueba si el usuario ya dio like. Si existe, lo borra y resta 1 al contador. Si no existe, lo inserta y suma 1.
- **Ventaja**: Evita condiciones de carrera y desincronización entre la tabla `likes` y el contador `likes_count`.
- **Triggers**: Al insertar/borrar, se disparan automáticamente las funciones de cálculo de viralidad (`calculate_viral_score`) e intereses del usuario.

### `toggle_repost(p_post_id uuid)`
- **Lógica**: Similar a toggle_like, pero para la tabla `reposts` y el contador `reposts_count`.

### `record_post_share(p_post_id uuid)`
- **Lógica**: Simplemente incrementa el contador `shares_count`.

---

## 2. Servicios: `PostService.ts` y `FeedService.ts`

### `PostService.ts`
- Se han eliminado las llamadas manuales a `.from('likes').insert(...)`.
- Ahora todas las interacciones usan `supabase.rpc('nombre_funcion')`. Esto reduce la cantidad de código en el frontend y mejora la seguridad.

### `FeedService.ts`
- **Batch Fetching de Usuarios**: Para evitar peticiones individuales (N+1), ahora se obtienen todos los perfiles de usuario de una vez para cada página del feed. Esto permite mostrar correctamente el **check de verificado** y los avatares sin errores de "undefined".
- **Media Mapping**: Se corrigió el mapeo de imágenes para que los posts propios del usuario también muestren sus fotos en la parte superior.

---

## 3. Frontend: Actualizaciones Optimistas (Fast UI)

Para eliminar la espera y las recargas completas de pantalla, se implementó un sistema de estado local en los componentes:

### Componentes: `PostsCard.tsx`, `PrincipalPost.tsx`, `ReplyItem.tsx`
- **Estado Local**: Se añadió `const [localPost, setLocalPost] = useState(post)`.
- **Acción Instantánea**: Al pulsar Like o Repost, el componente actualiza su propio estado **antes** de enviar la petición al servidor.
  - El corazón se vuelve rojo al instante.
  - El contador sube/baja de inmediato.
- **Sincronización Silenciosa**: La llamada al servicio ocurre en segundo plano. Ya no se llama a `onRefresh()` (que recargaba toda la lista), haciendo que la navegación sea fluida.

---

## 4. Resumen de Cambios Pendientes (Git Status)

Estos son los archivos modificados que están listos para ser añadidos al repositorio (`git add`):

### Funcionalidad Core
- **`src/Services/PostService.ts`**: Cambio a arquitectura basada en RPC.
- **`src/Services/FeedService.ts`**: Optimización de carga de usuarios y media.

### Interfaz de Usuario (Optimistic UI)
- **`src/Components/Posts/PostsCard.tsx`**: Lista principal con feedback instantáneo.
- **`src/Components/Posts/PrincipalPost.tsx`**: Vista detalle con feedback instantáneo.
- **`src/Components/Posts/ReplyItem.tsx`**: Comentarios con feedback instantáneo.

### Modelos y Rutas
- **`src/Types/Posts.ts`**: Actualización de interfaces para soportar objetos de usuario completos.
- **`src/app/(drawer)/post/[id].tsx`**: Lógica de navegación y refresco del detalle.
- **`src/app/(drawer)/_layout.tsx`** y **`src/app/(drawer)/(tabs)/profile/*`**: Ajustes de diseño y navegación.

### Archivos SQL (Nuevos)
- **`src/Sql/interactions_rpc.sql`**: **¡CRÍTICO!** Debe ejecutarse en Supabase antes de subir el código.
- **`src/Sql/fix_comments_count.sql`**: Corrección para el bug de conteo de comentarios.

---

## Próximos Pasos Sugeridos
1. Ejecutar `git add .` para preparar todos los archivos.
2. Ejecutar `git commit -m "feat: implement optimistic updates and RPC interactions for likes/reposts"`
3. Ejecutar `git push`.
