# Agora - Social Media Platform

Agora es una plataforma de red social moderna y dinámica desarrollada con **Expo** y **Supabase**. Está diseñada para ofrecer una experiencia fluida, visualmente atractiva y centrada en el contenido, con un fuerte enfoque en la interacción comunitaria a través de hilos, hashtags y menciones.

## 🚀 Características Principales

-   **Publicaciones Multi-Media**: Soporte para posts con múltiples imágenes, procesadas y optimizadas localmente.
-   **Hilos de Conversación**: Sistema completo de respuestas y jerarquía de posts para conversaciones profundas.
-   **Hashtags y Tendencias**: Registro global de hashtags y sistema de trending topics dinámico.
-   **Menciones de Usuarios**: Etiquetado de usuarios con sugerencias en tiempo real durante la edición.
-   **Perfiles Dinámicos**: Vista enriquecida de perfiles de usuario, incluyendo estadísticas, biografía y posts.
-   **Sistema de Seguimiento**: Funcionalidad de seguir/unseguir integrada para construir tu propia red.
-   **Interacciones en Tiempo Real**: Likes, reposts (quotes) y compartición de contenido.
-   **Diseño Premium**: UI moderna con soporte para modo oscuro (Dark Mode) y efectos visuales avanzados (Glassmorphism).

## 🛠️ Stack Tecnológico

-   **Framework**: [Expo](https://expo.dev/) (React Native)
-   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
-   **Base de Datos y Autenticación**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Estilos**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS v4)
-   **Navegación**: [Expo Router](https://docs.expo.dev/router/introduction/) (Basado en archivos)
-   **Iconografía**: [Lucide React Native](https://lucide.dev/) e [Ionicons](https://ionic.io/icons)

## 📦 Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd agora
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Variables de Entorno**:
   Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   ```

4. **Iniciar el proyecto**:
   ```bash
   npx expo start
   ```

## 📂 Estructura del Proyecto

-   `/src/Components`: Componentes UI reutilizables (PostCard, AppSearchBar, UserAvatar, etc.).
-   `/src/Services`: Lógica de comunicación con Supabase y servicios de procesamiento de imágenes.
-   `/src/Types`: Definiciones de interfaces y tipos de TypeScript para todo el proyecto.
-   `/app`: Rutas de la aplicación gestionadas por Expo Router.
-   `/assets`: Recursos gráficos, fuentes y logos oficiales.

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.
