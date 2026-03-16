# Documentación — [createPosts.tsx](file:///Users/mig334uel/agora/agora/src/Components/createPosts.tsx) (versión final)

## ¿Qué hace este componente?

Permite al usuario escribir una publicación con soporte para:
- **`@menciones`** — busca usuarios en Supabase y los resalta en azul
- **`#hashtags`** — busca trending topics y los resalta en azul
- Texto plano con color correcto según el tema oscuro/claro

---

## La librería: [react-native-controlled-mentions](file:///Users/mig334uel/agora/agora/node_modules/react-native-controlled-mentions)

### Cómo funciona realmente (API correcta)

La librería expone **dos conceptos separados**:

| Concepto | Para qué sirve |
|---|---|
| `triggersConfig` | Define los caracteres trigger (`@`, `#`) y su estilo visual una vez confirmados |
| `patternsConfig` | Estiliza texto plano mediante regex |
| `onTriggersChange` | **Callback propio de la librería** — Notifica el estado activo de cada trigger |

> **Error común**: La librería NO tiene `renderSuggestions` dentro de `triggersConfig`. Los dropdowns hay que renderizarlos manualmente fuera del `MentionInput`.

---

## Estructura del código

### 1. [SuggestionsList](file:///Users/mig334uel/agora/agora/src/Components/createPosts.tsx#29-58) — fuera del componente padre

```tsx
// ✅ A nivel de módulo, fuera de CreatePostScreen
function SuggestionsList({ keyword, onSelect, trigger, fetchFn, isDark }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (keyword == null) { setSuggestions([]); return; }
    fetchFn(keyword).then(setSuggestions);   // busca en Supabase
  }, [keyword]);

  if (keyword == null || suggestions.length === 0) return null;
  return ( /* FlatList con las sugerencias */ );
}
```

**Por qué fuera del padre:** Si se define dentro de [CreatePostScreen](file:///Users/mig334uel/agora/agora/src/Components/createPosts.tsx#72-169), React lo destruye y recrea en cada tecla pulsada → el `useState` se reinicia, el fetch se cancela, el dropdown nunca aparece.

---

### 2. Funciones de fetch — constantes de módulo

```tsx
// ✅ Constantes estáticas — se crean una sola vez al cargar el archivo
const fetchUsers = async (q) => { ... };    // busca en tabla users
const fetchHashtags = async (q) => { ... }; // busca en trending_topics
```

Si estuvieran dentro del componente, se recrearían en cada render y podrían disparar `useEffect` innecesariamente.

---

### 3. `onTriggersChange` — cómo se conecta el dropdown

```tsx
const [triggers, setTriggers] = useState({});

<MentionInput
  onTriggersChange={setTriggers}   // la librería nos pasa { keyword, onSelect } por trigger
  ...
/>

{/* Dropdowns fuera del MentionInput, consumiendo el estado */}
<SuggestionsList
  keyword={triggers.mention?.keyword}       // undefined = cerrado, string = abierto
  onSelect={triggers.mention?.onSelect}     // inserta la mención en el texto
  trigger="@"
  fetchFn={fetchUsers}
/>
```

- `keyword === undefined` → no se está escribiendo un trigger → dropdown oculto
- `keyword === ""` → trigger pulsado, sin texto después → dropdown visible (búsqueda vacía)
- `keyword === "mig"` → buscando "mig" → dropdown visible con resultados

---

### 4. `triggersConfig` — comportamiento de los triggers

```tsx
const triggersConfig = useMemo(() => ({
  mention: {
    trigger: '@',
    allowedSpacesCount: 0,   // ← al pulsar espacio, vuelve a texto plano
    textStyle: { fontWeight: 'bold', color: '#1DA1F2' },
  },
  hashtag: {
    trigger: '#',
    allowedSpacesCount: 0,
    textStyle: { fontWeight: 'bold', color: '#1DA1F2' },
  },
}), []);
```

`allowedSpacesCount: 0` → en cuanto el usuario pulsa espacio tras `@` o `#`, el tracking se cierra y el texto queda como plano.

---

### 5. `patternsConfig` — el bug del grupo de captura

```tsx
patternsConfig={{
  text: {
    pattern: /([^@#]+)/g,   // ← los paréntesis son OBLIGATORIOS
    textStyle: { color: isDark ? '#fff' : '#000', fontSize: 18 },
  },
}}
```

**El bug crítico que tuvimos:** La librería usa `String.split(regex)` internamente para dividir el texto. En JavaScript, `split` **solo incluye el texto matcheado en el array resultado si la regex tiene un grupo de captura [()](file:///Users/mig334uel/agora/agora/src/Components/createPosts.tsx#59-64)**:

```js
"hola mundo".split(/[a-z]+/)   // → ["", " ", ""]  ← texto no capturado!
"hola mundo".split(/([a-z]+)/) // → ["", "hola", " ", "mundo", ""] ← capturado ✓
```

Sin [()](file:///Users/mig334uel/agora/agora/src/Components/createPosts.tsx#59-64), el texto plano era consumido por el split pero no aparecía en el resultado → no se aplicaba el estilo → el texto aparecía negro en modo oscuro incluso después de una mención.

El patrón `/([^@#]+)/g` captura todo texto que no empieza con `@` ni `#`, sin solapar con los triggers.

---

## Flujo completo al escribir `@mig`

```
Usuario escribe "@mig"
        │
        ▼
MentionInput detecta trigger '@' → llama onTriggersChange
        │
        ▼
setTriggers({ mention: { keyword: "mig", onSelect: fn } })
        │
        ▼
SuggestionsList recibe keyword="mig" → fetchUsers("mig") → Supabase
        │
        ▼
Muestra lista de usuarios que contienen "mig"
        │
        ▼
Usuario toca un usuario → onSelect({ id, name })
        │
        ▼
Librería inserta "{@}[miguel](id123)" en el valor interno
Muestra "@miguel" en azul negrita
        │
        ▼
Usuario pulsa espacio → allowedSpacesCount=0 → tracking se cierra
Texto después del espacio → patternsConfig lo pinta blanco/negro
```

---

## Notas adicionales

- [searchUsers](file:///Users/mig334uel/agora/agora/src/Services/UserService.ts#4-25) requiere **mínimo 2 caracteres** → el dropdown de `@` aparece a partir de `@mi`
- Los triggers confirmados (seleccionados del dropdown) permanecen azules aunque se pulse espacio — eso es correcto
- `useMemo` en `triggersConfig` evita recrear el objeto en cada render (necesario para que `MentionInput` no reinicie su estado)
