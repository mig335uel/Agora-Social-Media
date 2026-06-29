# Roadmap y Análisis para finalizar "Ágora"

Este informe detalla exactamente qué piezas faltan en el código actual para considerar que el proyecto está "terminado" y listo para producción, tras analizar toda la estructura (rutas, componentes, servicios y caché).

## User Review Required
> [!IMPORTANT]
> Este documento sirve como plan maestro. Necesito tu aprobación y que me indiques **qué bloque de tareas quieres que empecemos a implementar primero**.



---

## Proposed Changes

### 1. Experiencia de Usuario y UI (UX Polish)
Actualmente, las transiciones de carga son ásperas (spinners o en blanco) y faltan indicadores visuales amigables.

- **Skeletons (Pantallas de carga fantasmas):** Implementar animaciones de Skeletons (cajas grises pulsantes) en el `Feed` (`foryou.tsx`, `follows.tsx`) y en el perfil del usuario antes de que lleguen los datos de Supabase.
- **Pantallas de Estado Vacío (Empty States):** Mejorar los diseños cuando no hay notificaciones, cuando el feed está vacío o cuando una búsqueda no arroja resultados, usando ilustraciones e invitaciones a interactuar.
- **Micro-Interacciones:** Falta animación al dar "Like" o "Repost" (ahora mismo cambia el estado de golpe). Añadir una animación suave con `react-native-reanimated`.

### 2. Gestión de Estado Global y Caché (Rendimiento)
Tu app maneja los estados en los propios componentes (`useState`) recargando desde Supabase cada vez que montas la pantalla.

- **Integración de React Query / SWR:** Necesitamos implementar una capa de caché (`@tanstack/react-query`). Esto evitará que la app parezca "lenta", ya que al volver al Feed o a un Perfil ya visitado, los datos aparecerán instantáneamente mientras se actualizan en segundo plano.
- **Paginación Infinita:** El `FeedService.ts` descarga el feed completo o con un límite fijo, pero falta la implementación de carga por páginas (Infinite Scroll) al llegar al final de la pantalla en `foryou.tsx`.

### 3. Mensajería (E2EE Chat)
El chat seguro (`MessageService.ts`) ya manda y recibe llaves y mensajes de texto, pero le faltan características estándar:

- **Indicadores de Escritura ("Typing..."):** No hay canales de Supabase Realtime notificando cuando el otro usuario está tecleando.
- **Recibos de Lectura (Vistos):** Falta la doble palomita azul para confirmar que el usuario leyó el mensaje.
- **Soporte Multimedia Seguro:** Permitir enviar imágenes dentro del chat E2EE (cifrando el Base64 de la imagen o la URL del storage antes de enviarlo).

### 4. Estabilidad y Manejo de Errores (Safety)
- **Sistema In-App Toasts:** En `NotificationService`, `authService` y vistas de edición se usa `Alert.alert` genérico. Debemos implementar un componente de "Toast" que descienda suavemente desde arriba (ej. "Perfil actualizado", "Publicado").
- **Validación de Formularios:** Falta `Zod` o `Yup` junto con `React Hook Form` en el registro y en la edición de perfil para que si el usuario mete un nombre muy largo o un email inválido, se muestre un texto de error debajo del campo en rojo, en lugar de fallar al enviar.
- **Error Boundaries:** Envolver las Tabs y pantallas de Chat en un `<ErrorBoundary>` de React para evitar que si un mensaje llega corrupto y falla el frontend, toda la aplicación se cierre (Crash).

---

## Verification Plan

### Automated Tests
- Ejecutar `npx tsc --noEmit` para asegurar que las implementaciones no dejan tipos `any` al vuelo.

### Manual Verification
- Una vez implementada una característica (ej. Skeletons), se probará abriendo la app en simulador, simulando red lenta para ver la transición.
- Para el chat, probaremos con dos cuentas simulando escribir para validar el Realtime de "Typing...".
