import { NativeModules } from 'react-native';
import { supabase } from '@/lib/supbase/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatInboxItem, DecryptedMessage } from '@/Types/Chats';
import * as SecureStore from 'expo-secure-store';

const AgoraBunker = NativeModules.AgoraBunker || NativeModules.AgoraBunkerModule;

// ─── Caché en RAM de llaves AES por chat ────────────────────────────────────
// La llave AES se descifra una sola vez al entrar al chat y vive en RAM.
// Al cerrar la app desaparece. Nunca se persiste en disco.
const aesKeyCache = new Map<string, string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ─── Descifrado de un único mensaje ─────────────────────────────────────────

async function decryptMessage(
    encryptedContent: string,
    aesKeyBase64: string,
): Promise<string> {
    if (!AgoraBunker) return '[E2EE no disponible]';
    try {
        const plain = await AgoraBunker.descifrarMensajeTextoR(encryptedContent, aesKeyBase64);
        return plain ?? '[mensaje cifrado]';
    } catch {
        return '[mensaje cifrado]';
    }
}

// ─── Obtener o descifrar la llave AES del chat ──────────────────────────────

async function getOrDecryptAesKey(chatId: string, myDeviceId: string): Promise<string | null> {
    // 1. ¿Ya la tenemos en caché?
    const cached = aesKeyCache.get(chatId);
    if (cached) return cached;

    if (!AgoraBunker) return null;

    try {
        // 2. Buscar el sobre cifrado con la llave pública de ESTE dispositivo
        const { data, error } = await supabase
            .from('chat_encripted_key')
            .select('encripted_key')
            .eq('chat_id', chatId)
            .eq('device_id', myDeviceId)
            .maybeSingle();

        if (error || !data?.encripted_key) {
            console.warn('[MessageService] No se encontró llave cifrada para el chat:', chatId);
            return null;
        }

        // 3. Abrir el candado RSA con la llave privada del hardware (TEE/Keychain)
        const aesKeyBase64: string = await AgoraBunker.descifrarLlaveDeChatR(data.encripted_key);

        // 4. Guardar en caché
        aesKeyCache.set(chatId, aesKeyBase64);
        return aesKeyBase64;
    } catch (e) {
        console.error('[MessageService] Error obteniendo llave AES:', e);
        return null;
    }
}

// ─── Cifrar un mensaje para enviar ──────────────────────────────────────────

async function encryptMessage(plainText: string, aesKeyBase64: string): Promise<string | null> {
    if (!AgoraBunker) return null;
    try {
        // Android: cifrarMensajeTextoR | iOS: cifrarMensajeTextoR
        const encrypted: string = await AgoraBunker.cifrarMensajeTextoR(plainText, aesKeyBase64);
        return encrypted;
    } catch (e) {
        console.error('[MessageService] Error cifrando mensaje:', e);
        return null;
    }
}

// ─── API PÚBLICA DEL SERVICIO ────────────────────────────────────────────────

export const MessageService = {

    /**
     * Limpia el caché de llaves AES (llamar en logout).
     */
    clearKeyCache(): void {
        aesKeyCache.clear();
    },

    /**
     * Obtiene la bandeja de entrada del usuario:
     * todos sus chats activos con el último mensaje (desencriptado) y datos del contacto.
     */
    async getInbox(myUserId: string): Promise<ChatInboxItem[]> {
        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) {
                console.warn('[MessageService] No hay device_identifier en SecureStore');
            }

            // 1. Obtener los chats en los que participo (no archivados, no salidos)
            const { data: participations, error: partErr } = await supabase
                .from('chat_participants')
                .select('chat_id, last_read_at')
                .eq('user_id', myUserId)
                .is('left_at', null);

            if (partErr || !participations?.length) return [];

            const chatIds = participations.map((p) => p.chat_id);

            // 2. Obtener datos base de los chats + el otro participante + último mensaje
            const { data: chatsRaw, error: chatErr } = await supabase
                .from('chats')
                .select(`
                    id,
                    type,
                    name,
                    created_at,
                    chat_participants!inner(user_id, users(id, username, display_name, profile_picture_url, is_verified)),
                    chat_content(id, content, sender_id, created_at)
                `)
                .in('id', chatIds)
                .order('created_at', { referencedTable: 'chat_content', ascending: false })
                .limit(1, { referencedTable: 'chat_content' });

            if (chatErr || !chatsRaw) return [];

            // 3. Construir los items desencryptando el último mensaje
            const items: ChatInboxItem[] = [];

            for (const chat of chatsRaw) {
                // El "contacto" es el otro participante (no yo)
                const otherParticipant = (chat.chat_participants as any[])
                    .find((p: any) => p.user_id !== myUserId);

                if (!otherParticipant?.users) continue;

                const contact = otherParticipant.users as {
                    id: string;
                    username: string;
                    display_name: string;
                    profile_picture_url: string | null;
                    is_verified?: boolean;
                };

                // Último mensaje
                const rawMessages = (chat.chat_content as any[]);
                const lastRaw = rawMessages?.[0] ?? null;

                let lastMessage: DecryptedMessage | null = null;

                if (lastRaw && myDeviceId) {
                    const aesKey = await getOrDecryptAesKey(chat.id, myDeviceId);
                    const plainText = aesKey
                        ? await decryptMessage(lastRaw.content, aesKey)
                        : '[mensaje cifrado]';

                    lastMessage = {
                        id: lastRaw.id,
                        chat_id: chat.id,
                        sender_id: lastRaw.sender_id,
                        content_encrypted: lastRaw.content,
                        content: plainText,
                        created_at: lastRaw.created_at,
                        isMine: lastRaw.sender_id === myUserId,
                    };
                }

                // Contar no leídos
                const myParticipation = participations.find((p) => p.chat_id === chat.id);
                const lastReadAt = myParticipation?.last_read_at;
                let unread = 0;
                if (lastReadAt) {
                    unread = rawMessages.filter(
                        (m: any) => m.sender_id !== myUserId && new Date(m.created_at) > new Date(lastReadAt)
                    ).length;
                }

                items.push({
                    chat_id: chat.id,
                    chat_type: chat.type,
                    chat_name: chat.name,
                    contact,
                    last_message: lastMessage,
                    unread_count: unread,
                    updated_at: lastRaw?.created_at ?? chat.created_at ?? '',
                });
            }

            // Ordenar por mensaje más reciente
            return items.sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
        } catch (e) {
            console.error('[MessageService] Error en getInbox:', e);
            return [];
        }
    },

    /**
     * Obtiene todos los mensajes de un chat y los desencripta.
     */
    async getMessages(chatId: string, myUserId: string): Promise<DecryptedMessage[]> {
        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) return [];

            // 1. Obtener mensajes ordenados
            const { data, error } = await supabase
                .from('chat_content')
                .select('id, chat_id, content, sender_id, created_at')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .limit(60);

            if (error || !data) return [];

            // 2. Obtener la llave AES del chat (una sola vez)
            const aesKey = await getOrDecryptAesKey(chatId, myDeviceId);

            // 3. Descifrar todos en paralelo
            const decrypted = await Promise.all(
                data.map(async (msg) => {
                    const plain = aesKey
                        ? await decryptMessage(msg.content, aesKey)
                        : '[mensaje cifrado]';
                    return {
                        id: msg.id,
                        chat_id: msg.chat_id,
                        sender_id: msg.sender_id,
                        content_encrypted: msg.content,
                        content: plain,
                        created_at: msg.created_at!,
                        isMine: msg.sender_id === myUserId,
                    } as DecryptedMessage;
                })
            );

            return decrypted;
        } catch (e) {
            console.error('[MessageService] Error en getMessages:', e);
            return [];
        }
    },

    /**
     * Cifra y envía un mensaje. Devuelve el mensaje desencriptado para actualizarlo
     * en el estado de la UI sin esperar al Realtime (optimistic update).
     */
    async sendMessage(
        chatId: string,
        senderId: string,
        plainText: string,
    ): Promise<DecryptedMessage | null> {
        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) throw new Error('No device ID');

            const aesKey = await getOrDecryptAesKey(chatId, myDeviceId);
            if (!aesKey) throw new Error('No AES key for chat');

            const encrypted = await encryptMessage(plainText, aesKey);
            if (!encrypted) throw new Error('Encryption failed');

            const { data, error } = await supabase
                .from('chat_content')
                .insert({ chat_id: chatId, sender_id: senderId, content: encrypted })
                .select('id, chat_id, content, sender_id, created_at')
                .single();

            if (error) throw error;

            return {
                id: data.id,
                chat_id: data.chat_id,
                sender_id: data.sender_id,
                content_encrypted: data.content,
                content: plainText, // ya lo tenemos en claro, sin necesidad de descifrar
                created_at: data.created_at!,
                isMine: true,
            };
        } catch (e) {
            console.error('[MessageService] Error en sendMessage:', e);
            return null;
        }
    },

    /**
     * Suscribe al canal Realtime de un chat.
     * cb recibe el mensaje ya desencriptado.
     * Devuelve el canal para que el componente pueda desuscribirse en cleanup.
     */
    subscribeToChat(
        chatId: string,
        myUserId: string,
        cb: (msg: DecryptedMessage) => void,
    ): RealtimeChannel {
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_content', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    const raw = payload.new as { id: string; chat_id: string; content: string; sender_id: string; created_at: string };

                    // Si es mi propio mensaje ya lo añadimos via optimistic update → ignorar
                    if (raw.sender_id === myUserId) return;

                    const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
                    const aesKey = myDeviceId ? await getOrDecryptAesKey(chatId, myDeviceId) : null;
                    const plain = aesKey
                        ? await decryptMessage(raw.content, aesKey)
                        : '[mensaje cifrado]';

                    cb({
                        id: raw.id,
                        chat_id: raw.chat_id,
                        sender_id: raw.sender_id,
                        content_encrypted: raw.content,
                        content: plain,
                        created_at: raw.created_at,
                        isMine: false,
                    });
                },
            )
            .subscribe();

        return channel;
    },

    /** Marca todos los mensajes de un chat como leídos */
    async markAsRead(chatId: string, userId: string): Promise<void> {
        await supabase
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('chat_id', chatId)
            .eq('user_id', userId);
    },

    timeAgo,
};
