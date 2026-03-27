# Guía de Arquitectura: Perfil "Estilo TikTok" (Single Scroll)

Esta guía documenta la nueva arquitectura de las pantallas de perfil ([(drawer)/perfil/[id].tsx](file:///Users/mig334uel/agora/agora/src/app/%28drawer%29/perfil/%5Bid%5D.tsx#17-206) y [(tabs)/profile/index.tsx](file:///Users/mig334uel/agora/agora/src/app/%28drawer%29/perfil/%5Bid%5D.tsx#17-206)) implementada para soportar el Pull-to-Refresh global, y explica cómo extenderla para añadir nuevas pestañas.

## 1. Arquitectura Central

La arquitectura anterior usaba `react-native-collapsible-tab-view`, la cual separaba la cabecera del cuerpo de posts. Esto rompía el pull-to-refresh global en iOS.

**La Nueva Arquitectura:**
- **Todo es una Lista:** Toda la pantalla es ahora un único gran componente genérico de tipo `<FlatList>`.
- **La Cabecera es un Elemento de la Lista:** La foto de perfil, la biografía, el botón de "Editar Perfil" y la barra de pestañas (Tabs) no son entidades separadas; se renderizan juntas usando la propiedad `ListHeaderComponent={renderHeader}` del FlatList.
- **Refresh Nativo:** Como el `RefreshControl` nativo está directamente atado al FlatList padre, al arrastrar hacia abajo desde cualquier parte de la cabecera (incluso desde la foto de perfil), el sistema operativo lo detecta como un scroll válido y activa la barrita de carga (spinner).

---

## 2. Archivos Involucrados

1. **[Components/MyProfileScreen/ProfileCustomTabBar.tsx](file:///Users/mig334uel/agora/agora/src/Components/MyProfileScreen/ProfileCustomTabBar.tsx)**: Dibuja la barra de pestañas visual con el comportamiento de "activo" o "inactivo". Emite el tab clickeado mediante `onTabChange`.
2. **`app/(tabs)/profile/index.tsx`**: Contiene el FlatList (envuelto en `PostsCard`) con su `ListHeaderComponent` inyectado para el propio usuario logueado. Controla sus propios datos (`activeTab`, `refreshing`, `posts`).
3. **`app/(drawer)/perfil/[id].tsx`**: Equivalente a la pantalla de arriba pero orientada a perfiles de terceros (requiere hacer refetch de la entidad `user` ajena).

---

## 3. ¿Cómo añadir un nuevo Tab (ej. "Media" o "Likes")?

Actualmente, solo devolvemos los "posts" (`activeTab === "posts"`). Para añadir un nuevo tab, debes seguir estos **tres pasos**:

### Paso A. Actualizar la Interfaz de la Barra ([ProfileCustomTabBar.tsx](file:///Users/mig334uel/agora/agora/src/Components/MyProfileScreen/ProfileCustomTabBar.tsx))

Agrega el nuevo botón al diseño. 

```tsx
// ProfileCustomTabBar.tsx
export default function ProfileCustomTabBar({ activeTab, onTabChange }) {
    // ...
    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Tab 1: Posts */}
            <TouchableOpacity style={styles.tab} onPress={() => onTabChange("posts")}>
                <Ionicons name="grid" size={22} color={activeTab === "posts" ? activeColor : inactiveColor} />
                {activeTab === "posts" && <View style={[styles.indicator, { backgroundColor: activeColor }]} />}
            </TouchableOpacity>
            
            {/* Tab 2: Likes (EJEMPLO NUEVO TAB) */}
            <TouchableOpacity style={styles.tab} onPress={() => onTabChange("likes")}>
                <Ionicons name="heart" size={22} color={activeTab === "likes" ? activeColor : inactiveColor} />
                {activeTab === "likes" && <View style={[styles.indicator, { backgroundColor: activeColor }]} />}
            </TouchableOpacity>
        </View>
    );
}
```

### Paso B. Crear Estado y Lógica de Datos en las Pantallas

Ve a [profile/index.tsx](file:///Users/mig334uel/agora/agora/src/app/%28drawer%29/%28tabs%29/profile/index.tsx) (o `perfil/[id].tsx`). Tendrás que añadir un estado para tu nueva información que corresponde a tu nueva pestaña:

```tsx
// 1. Añadimos un estado para los datos del nuevo tab
const [likedPosts, setLikedPosts] = useState<Post[]>([]);

// 2. Modificamos el fetcher para consultar los posts de esta categoría
const fetchPosts = useCallback(async () => {
    // ... tu lógica de posts por defecto
    // Aquí puedes incluir también la consulta a Supabase de tus posts 'gustados'
}, []);
```

### Paso C. Inyectar la Data Condicional al FlatList

Lo revolucionario de la arquitectura del Single Scroll es que no tienes que "esconder" vistas u ocultar paneles, simplemente tienes que cambiar el Array de información que le pasas al `FlatList`.

```tsx
return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
        <PostCard
            // 💡 MAGIA AQUÍ: Condicional de Array
            // Si la tab activa es 'posts', mandamos la data `posts`. 
            // Si la tab activa es 'likes', cambiamos la referencia a la de array temporal `likedPosts`.
            posts={activeTab === "posts" ? posts : activeTab === "likes" ? likedPosts : []}

            ListHeaderComponent={renderHeader()}
            onRefresh={onRefresh}
            refreshing={refreshing}
            FlatListComponent={FlatList}
        />
    </View>
);
```

> **Nota Adicional sobre [renderItem](file:///Users/mig334uel/agora/agora/src/app/%28drawer%29/perfil/%5Bid%5D.tsx#116-125):**  
> Como ahora pasamos la UI por un solo `<FlatList>`, si el contenido de tu nueva pestaña *difiere* del clásico Post de Twitter (por ejemplo, si la tab "Media" fuera una grilla de fotos o cubos en lugar de un listado de posts), podrías hacer un chequeo adentro de tu [renderItem](file:///Users/mig334uel/agora/agora/src/app/%28drawer%29/perfil/%5Bid%5D.tsx#116-125) de tu FlatList (o dentro del mapping en [PostsCard.tsx](file:///Users/mig334uel/agora/agora/src/Components/Posts/PostsCard.tsx)) para renderizar un componente `<ImageGrid>` en lugar de un `<PostCardItem>` cuando `activeTab === "media"`.
