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

## 3. Frontend: Refactorización de Componentes y Fast UI

Para mejorar la mantenibilidad y la experiencia de usuario (Zero-Latency UI), se ha reestructurado la forma en que se renderizan las publicaciones:

### 3.1. División en `PostCard` y `PostsCard`
- **`PostCard.tsx` (Nuevo)**: Se extrajo la lógica de una única publicación a este componente atómico. Esto permite que cada post maneje su propio estado interno y modales de respuesta de forma aislada.
- **`PostsCard.tsx` (Modificado)**: Ahora actúa únicamente como un contenedor de lista (FlatList) que utiliza el nuevo `PostCard`. Esto soluciona errores de tipado en TypeScript y mejora el rendimiento al no duplicar lógica de renderizado.

### 3.2. Actualizaciones Optimistas e Interacciones
- **Estado Local**: Se añadió `const [localPost, setLocalPost] = useState(post)` en los componentes de detalle.
- **Acción Instantánea**: Al pulsar Like o Repost, el componente actualiza su propio estado **antes** de confirmar con el servidor.
- **Contador de Comentarios**: Se ha habilitado la visualización y actualización instantánea del conteo de respuestas (`replies_count`) tras publicar un comentario.

---

## 4. Perfil Dinámico y Mejoras de Navegación

### 4.1. Perfil de Otros Usuarios (`/perfil/[id]`)
- **Adaptación de `ProfileHeader.tsx`**: Ahora detecta automáticamente si el usuario que se está visualizando es el usuario autenticado.
- **Botón Dinámico**: Muestra "Editar Perfil" si eres tú, o "Seguir/Dejar de seguir" si es otro usuario.
- **Sincronización de Estadísticas**: Se integró con `ProfileRefreshContext` para que los números de seguidores/seguidos se actualicen sin refrescar la página completa tras un cambio.

### 4.2. Correcciones en la AppBar de Perfil
- **Navegación Intuitiva**: Cuando visitas el perfil de otra persona, el icono de ajustes (tuerca) se sustituye por una **flecha de retroceso** (`chevron-back`) que permite volver atrás fácilmente.
- **Seguridad**: Se oculta el botón de "Cerrar sesión" cuando no estás en tu propio perfil.

---

## 5. Correcciones Técnicas (Bugs Solucionados)

- **Creación de Respuestas**: Se corrigió un fallo donde el contenido y las imágenes no se pasaban correctamente desde el editor al servicio de creación de posts.
- **Navegación al Perfil**: Se añadieron enlaces (`TouchableOpacity`) en las fotos de perfil y nombres de usuario dentro de los feeds para permitir navegar a los perfiles de otros usuarios.
- **Layout de Cabecera**: Se ajustó el estilo en `PrincipalPost.tsx` para que el botón de "tres puntos" (opciones) se mantenga alineado a la derecha cuando el nombre del autor ocupa espacio.
- **Consulta de Seguidores**: Se arregló un error de sintaxis en el servicio de Supabase para el feed de seguidos (`follows.tsx`), permitiendo la carga correcta de posts de usuarios seguidos.

---

## Resumen de Archivos Clave Modificados

- **Componentes**: `PostCard.tsx`, `PostsCard.tsx`, `PrincipalPost.tsx`, `ReplyItem.tsx`, `AppBar.tsx`, `ProfileHeader.tsx`.
- **Servicios**: `PostService.ts`, `FeedService.ts`, `UserService.ts`.
- **Pantallas**: `perfil/[id].tsx`, `(tabs)/profile/*`, `post/[id].tsx`, `(tabs)/feed/follows.tsx`.

---

## Próximos Pasos Recomendados

1. **Despliegue**: Asegurarse de ejecutar los scripts SQL (`src/Sql/*.sql`) en Supabase para tener las funciones RPC listas.
2. **Commit Final**: `git add . && git commit -m "refactor: component structure, profile navigation, and optimistic UI fixes"`
3. **Push**: `git push`

