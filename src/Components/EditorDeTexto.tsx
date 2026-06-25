import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickAndProcessImage, ProcessedImage } from '../Services/ImageService';
import PostDetailAppBar from './Posts/PostDetailAppBar';
import AppBar from './AppBar';

interface EditorDeTextoProps {
  value: string;
  onChange: (text: string) => void;
  onSearchMention: (query: string) => Promise<any[]>;
  onSearchHashtag: (query: string) => Promise<any[]>;
  onPublish: (content: string, images: ProcessedImage[]) => Promise<void>;
  placeholder?: string;
  isDark?: boolean;
  hashtagMandatory?: boolean;
  appBar?: boolean;
}

export const EditorDeTexto = ({
  value,
  onChange,
  onSearchMention,
  onSearchHashtag,
  onPublish,
  placeholder = "Comparte algo interesante...",
  isDark = false,
  hashtagMandatory = false,
  appBar = true
}: EditorDeTextoProps) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [triggerType, setTriggerType] = useState<'@' | '#' | null>(null);
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const inputRef = useRef<TextInput>(null);

  /**
   * Rastrea la posición del cursor cada vez que cambia (al escribir o tocar).
   * Es esencial para saber dónde insertar las menciones.
   */
  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(event.nativeEvent.selection);
  };

  /**
   * Se ejecuta cada vez que el texto cambia.
   * Busca si la última palabra escrita antes del cursor empieza por @ o #.
   */
  const handleChangeText = async (text: string) => {
    onChange(text);

    // Detectar qué hay justo antes del cursor
    const cursorPosition = selection.start;
    const textBeforeCursor = text.slice(0, cursorPosition);

    // Regex para encontrar "@usuario" o "#hashtag" al final de lo escrito
    const lastWordMatch = textBeforeCursor.match(/[@#](\w*)$/);

    if (lastWordMatch) {
      const trigger = textBeforeCursor[lastWordMatch.index!];
      const currentQuery = lastWordMatch[1];

      setTriggerType(trigger as '@' | '#');
      setQuery(currentQuery);

      // Llamada a las funciones de búsqueda pasadas por props
      let results = [];
      if (trigger === '@') {
        results = await onSearchMention(currentQuery);
      } else {
        results = await onSearchHashtag(currentQuery);
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Inserta la sugerencia seleccionada en el texto.
   * Realiza un "corte" del string original para reemplazar solo la parte de la búsqueda.
   */
  const handleSelectSuggestion = (suggestion: any) => {
    const cursorPosition = selection.start;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);

    // Buscamos el inicio del trigger (@ o #) para saber desde dónde borrar
    const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerType!);
    const newTextBefore = value.slice(0, lastTriggerIndex);

    // El nombre a insertar (depende de si es usuario o hashtag)
    const insertion = `${triggerType}${suggestion.username || suggestion.name || suggestion} `;
    const newValue = newTextBefore + insertion + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Devolvemos el foco al teclado tras la inserción
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleAddImage = async () => {
    setIsUploading(true);
    try {
      const processedList = await pickAndProcessImage(true);
      if (processedList && processedList.length > 0) {
        setImages([...images, ...processedList]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async () => {
    // Validación de hashtag obligatorio
    const hashtagRegex = /#[\wñáéíóú]+/g;
    const hasHashtags = hashtagRegex.test(value);

    if (hashtagMandatory && !hasHashtags) {
      // Solo bloqueamos si es obligatorio
      return;
    }

    if ((!value.trim() && images.length === 0) || isPublishing) return;
    setIsPublishing(true);
    try {
      await onPublish(value, images);
      // Limpiamos el editor después de publicar con éxito
      onChange('');
      setImages([]);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Error publishing:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  /**
   * Procesa el texto para pintar de color las menciones y hashtags.
   */
  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const regex = /([@#][\wñáéíóú]+)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (part.match(regex)) {
        return (
          <Text key={index} style={{ color: '#2563eb' }}>
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  // Renderizado con Highlighting (Overlay)
  return (
    <>
      
      <View style={{ marginBottom: 20 }} />
      <View style={styles.container}>
        {showSuggestions && (
          <View style={[styles.suggestionsBox, isDark && styles.darkBox]}>
            <FlatList
              data={suggestions}
              keyboardShouldPersistTaps="always"
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                if (triggerType === '@') {
                  const user = item as any;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectSuggestion(user)}
                      style={[styles.suggestionItem, isDark && styles.darkSuggestionItem]}
                    >
                      <Image
                        source={{ uri: user.profile_picture_url || 'https://via.placeholder.com/40' }}
                        style={styles.suggestionAvatar}
                      />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={[styles.suggestionName, { color: isDark ? 'white' : 'black' }]}>
                          {user.display_name || user.username}
                        </Text>
                        <Text style={styles.suggestionUsername}>@{user.username}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  const topic = item as string;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectSuggestion(topic)}
                      style={[styles.suggestionItem, isDark && styles.darkSuggestionItem]}
                    >
                      <View style={styles.hashtagIconBox}>
                        <Text style={styles.hashtagIconText}>#</Text>
                      </View>
                      <View style={styles.suggestionTextContainer}>
                        <Text style={[styles.suggestionName, { color: isDark ? 'white' : 'black' }]}>
                          {topic}
                        </Text>
                        <Text style={styles.suggestionUsername}>Tendencia en Agora</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
              }}
            />
          </View>
        )}

        <View style={styles.inputWrapper}>
          {/* Un solo TextInput con soporte nativo de Rich Text (elimina la sombra fantasma) */}
          <TextInput
            ref={inputRef}
            multiline
            // Usamos children en lugar de value para que Android pinte los colores directamente
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={value.length === 0 ? placeholder : ''}
            placeholderTextColor={isDark ? '#555' : '#999'}
            style={[styles.inputBase, styles.textInput, { color: isDark ? 'white' : 'black' }]}
            selectionColor={isDark ? '#2563eb55' : '#2563eb33'}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            autoCorrect={true}
            spellCheck={false}
          >
            <Text style={{ color: isDark ? 'white' : 'black' }}>
              {renderHighlightedText(value)}
              {value.endsWith('\n') ? '\n ' : ''}
            </Text>
          </TextInput>
        </View>

        {/* Vista previa de imágenes */}
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            <FlatList
              data={images}
              horizontal
              keyExtractor={(item) => item.uri}
              renderItem={({ item, index }) => (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: item.uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* Barra de herramientas */}
        <View style={[styles.toolbar, isDark && styles.darkToolbar]}>
          <View style={styles.leftTools}>
            <TouchableOpacity onPress={handleAddImage} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Ionicons name="image-outline" size={24} color="#2563eb" />
              )}
            </TouchableOpacity>

            {/* Aviso de hashtag obligatorio si está activado y el texto no está vacío */}
            {hashtagMandatory && value.trim().length > 0 && !/#[\wñáéíóú]+/g.test(value) && (
              <Text style={{ color: '#ff4444', fontSize: 12, marginLeft: 10 }}>
                Falta un #hashtag obligatorio
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handlePublish}
            disabled={isPublishing || (!value.trim() && images.length === 0) || (hashtagMandatory && !/#[\wñáéíóú]+/g.test(value))}
            style={[
              styles.publishBtn,
              (isPublishing || (!value.trim() && images.length === 0) || (hashtagMandatory && !/#[\wñáéíóú]+/g.test(value))) && styles.disabledBtn
            ]}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.publishBtnText}>Compartir</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
  },
  inputWrapper: {
    position: 'relative',
    minHeight: 120,
  },
  inputBase: {
    fontSize: 16,
    lineHeight: 22,
    padding: 10,
    margin: 0, // Añadir explícitamente
    minHeight: 120,
    includeFontPadding: false, // CRÍTICO PARA ANDROID: Iguala el Text y el TextInput
    textAlignVertical: 'top',  // CRÍTICO PARA ANDROID
  },
  highlightLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  textInput: {
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  darkInput: {
    color: 'white',
  },
  suggestionsBox: {
    borderWidth: 0,
    borderRadius: 12,
    marginTop: 8,
    marginHorizontal: 10,
    backgroundColor: 'white',
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  darkBox: {
    backgroundColor: '#1E1E1E',
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  darkSuggestionItem: {
    borderBottomColor: '#333',
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  suggestionTextContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  suggestionName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  suggestionUsername: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  hashtagIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hashtagIconText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  imagesContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  imageWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imageThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 20,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  darkToolbar: {
    borderTopColor: '#333',
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishBtn: {
    backgroundColor: '#2563eb', // A more modern, deeper blue than Twitter's
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
