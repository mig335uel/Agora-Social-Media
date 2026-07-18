# Documentación de Fixes: Apple App Store Review (Latencia Transoceánica)

A continuación se detallan los cambios técnicos implementados en el código fuente de React Native (Expo) para resolver los dos motivos de rechazo indicados por los revisores de Apple en California. 

El problema raíz de ambos rechazos no era un fallo lógico en el código, sino la **latencia de red** (~150-250ms) entre los laboratorios de Apple (EE.UU.) y la base de datos actual de Supabase alojada en Europa (Free Tier), que provocaba que la UI pareciera no responder.

---

## 1. Corrección del Botón "Editar Perfil" (Aparente falta de respuesta)
**Motivo de rechazo de Apple:** Al pulsar el botón "Editar perfil" no ocurría nada o tardaba demasiado, dando la sensación de que el botón estaba roto.

**Solución Implementada:** Programación Defensiva (Defensive UI). Se ha forzado una respuesta visual inmediata en milisegundos para que el revisor sepa que la app está procesando la solicitud, mitigando la sensación de "congelación" mientras viajan los datos.

### Cambios en Archivos
*   **Archivo:** `src/Components/MyProfileScreen/ProfileHeader.tsx`
*   **Modificaciones:**
    *   Se actualizó la forma de llamar a las rutas usando el objeto `router.push({ pathname: ... })` de Expo Router para asegurar consistencias en el enrutamiento profundo.
    *   Se añadió lógica de estado de carga: Si el estado del usuario (`user.id` o datos del perfil) aún se está obteniendo de la red, al pulsar el botón se muestra un mensaje de "Cargando..." o un indicador visual en lugar de ignorar el toque de la pantalla.

---

## 2. Corrección del Feed de Perfil (Los posts nuevos no aparecían)
**Motivo de rechazo de Apple:** El revisor creaba un nuevo post, se cerraba el modal, pero el post no aparecía inmediatamente en el feed de su perfil. Tenía que reiniciar la app o hacer pull-to-refresh manual.

**Solución Implementada:** Cambio del ciclo de vida del componente. El modal de "Nuevo Post" en iOS se superpone sobre la pantalla del perfil. Al cerrarse, React Navigation no vuelve a montar el componente principal, por lo que el `useEffect` clásico no se dispara para recargar los posts.

### Cambios en Archivos
*   **Archivo:** `src/app/(drawer)/(tabs)/profile/index.tsx`
*   **Modificaciones:**
    *   Se eliminó el hook tradicional `useEffect` para la obtención inicial de posts.
    *   Se importó e implementó **`useFocusEffect`** nativo de `expo-router` / `@react-navigation/native`.
    *   **Efecto:** Ahora, en el milisegundo exacto en el que el modal de crear post se cierra y la pantalla del perfil vuelve a estar "enfocada" (en primer plano), se dispara automáticamente el `fetchPosts()`. Esto garantiza que los posts recién subidos a Supabase se rendericen de inmediato.

---

## Resultado
Estas dos modificaciones de UX (Experiencia de Usuario) orientadas a camuflar y compensar la alta latencia fueron las responsables directas de que el revisor de Apple experimentara fluidez y, finalmente, **aprobara el pase a Producción.**
