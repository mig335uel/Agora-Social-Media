import { NativeModules } from 'react-native';
import { supabase } from '@/lib/supbase/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatInboxItem, DecryptedMessage } from '@/Types/Chats';
import * as SecureStore from 'expo-secure-store';

const AgoraBunker = NativeModules.AgoraBunker || NativeModules.AgoraBunkerModule;

// 🔍 LOG DE DIAGNÓSTICO — borrar tras depurar
console.log('[DIAG] NativeModules.AgoraBunker:', NativeModules.AgoraBunker ? 'EXISTE' : 'undefined');
console.log('[DIAG] NativeModules.AgoraBunkerModule:', NativeModules.AgoraBunkerModule ? 'EXISTE' : 'undefined');
console.log('[DIAG] AgoraBunker resuelto:', AgoraBunker ? JSON.stringify(Object.keys(AgoraBunker)) : 'NULL');

// ─── Estado en RAM para la sesión actual ─────────────────────────────────────
// Para no hacer pings continuos al Búnker, guardamos qué chats ya sabemos 
// que tienen su llave cargada en la bóveda nativa.
const chatsVerificadosEnBunker = new Set<string>();

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

async function decryptMessage(encryptedContent: string, chatId: string): Promise<string> {
    if (!AgoraBunker) return '[E2EE no disponible]';
    try {
        const plain = await AgoraBunker.descifrarMensajeTextoConChat(chatId, encryptedContent);
        return plain ?? '[mensaje cifrado]';
    } catch {
        return '[mensaje cifrado]';
    }
}

// ─── Asegurar que la llave AES está en la Bóveda Nativa ─────────────────────

async function asegurarLlaveEnBunker(chatId: string, myDeviceId: string): Promise<boolean> {
    if (chatsVerificadosEnBunker.has(chatId)) return true;
    if (!AgoraBunker) return false;

    try {
        // 1. Hack rápido: probamos a cifrar un texto tonto para ver si el Búnker ya tiene la llave
        // en su disco seguro de una sesión anterior.
        try {
            await AgoraBunker.cifrarMensajeTextoConChat(chatId, "ping");
            chatsVerificadosEnBunker.add(chatId);
            return true; // ¡La llave ya estaba guardada nativamente!
        } catch {
            // El Búnker rechazó el cifrado (probablemente no tiene la llave)
            // Pasamos al paso 2.
        }

        // 2. Descargamos el candado RSA del servidor
        const dbDeviceId = (await SecureStore.getItemAsync('agora_device_db_id') ?? myDeviceId).trim();
        console.log(`[MessageService] 🌐 Descargando candado RSA desde servidor para chat: ${chatId} | device_id: ${dbDeviceId}`);
        
        const { data, error } = await supabase
            .from('chat_encripted_key')
            .select('encripted_key')
            .eq('chat_id', chatId)
            .eq('device_id', dbDeviceId)
            .maybeSingle();

        if (error || !data?.encripted_key) {
            console.warn('[MessageService] ⚠️ No se encontró llave cifrada en el servidor para el chat:', chatId);
            return false;
        }

        // 3. Entregamos el candado RSA al Búnker nativo para que lo abra y guarde el AES
        await AgoraBunker.descifrarYGuardarLlaveDeChat(chatId, data.encripted_key);
        
        chatsVerificadosEnBunker.add(chatId);
        return true;
    } catch (e) {
        console.error('[MessageService] Error asegurando llave en el búnker:', e);
        return false;
    }
}

// ─── Cifrar un mensaje para enviar ──────────────────────────────────────────

async function encryptMessage(plainText: string, chatId: string): Promise<string | null> {
    if (!AgoraBunker) return null;
    try {
        const encrypted: string = await AgoraBunker.cifrarMensajeTextoConChat(chatId, plainText);
        return encrypted;
    } catch (e) {
        console.error('[MessageService] Error cifrando mensaje:', e);
        return null;
    }
}

// ─── API PÚBLICA DEL SERVICIO ────────────────────────────────────────────────

export const MessageService = {

    /**
     * Asegura que la llave AES está en el Búnker Nativo
     */
    asegurarLlaveEnBunker,

    /**
     * Limpia la bóveda de llaves AES del Búnker Nativo (llamar en logout).
     */
    async clearKeyCache(): Promise<void> {
        chatsVerificadosEnBunker.clear();
        if (AgoraBunker && AgoraBunker.borrarTodasLasLlavesLocales) {
            await AgoraBunker.borrarTodasLasLlavesLocales().catch((e: any) => console.warn(e));
        }
    },

    /**
     * Inyecta un candado RSA descargado en tiempo real en la bóveda.
     * Lo llama el listener global de Realtime cuando llega un INSERT en chat_encripted_key.
     */
    async asimilarCandadoRealtime(chatId: string, candadoBase64: string): Promise<void> {
        try {
            if (AgoraBunker && candadoBase64) {
                await AgoraBunker.descifrarYGuardarLlaveDeChat(chatId, candadoBase64);
                chatsVerificadosEnBunker.add(chatId);
                console.log(`[MessageService] 🔑 Candado RSA asimilado en tiempo real para chat: ${chatId}`);
            }
        } catch (e) {
            console.error(`[MessageService] Fallo asimilando candado realtime para chat ${chatId}:`, e);
        }
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

            // 1. Obtener los chats en los que participo
            //    · left_at  IS NULL → no ha abandonado el chat
            //    · hidden_at IS NULL → no lo ha ocultado manualmente
            const { data: participations, error: partErr } = await supabase
                .from('chat_participants')
                .select('chat_id, last_read_at')
                .eq('user_id', myUserId)
                .is('left_at', null)
                .is('hidden_at', null);

            if (partErr || !participations?.length) return [];

            const chatIds = participations.map((p) => p.chat_id);

            // 2. Obtener datos base de los chats de forma independiente
            const { data: chatsRaw, error: chatErr } = await supabase
                .from('chats')
                .select('id, type, name')
                .in('id', chatIds);

            if (chatErr || !chatsRaw) {
                console.warn('[MessageService] Error cargando chats:', chatErr?.message);
                return [];
            }

            // Obtener participantes de forma independiente
            const { data: allParticipants } = await supabase
                .from('chat_participants')
                .select('chat_id, user_id')
                .in('chat_id', chatIds);

            // Obtener usuarios de forma independiente
            const userIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];
            const { data: usersData } = await supabase
                .from('users')
                .select('id, username, display_name, profile_picture_url, is_verified')
                .in('id', userIds);

            const usersMap = new Map();
            usersData?.forEach((u) => usersMap.set(u.id, u));

            // Ensamblar los chats para compatibilidad con el resto del código
            const assembledChats = chatsRaw.map((c) => {
                const parts = allParticipants?.filter((p) => p.chat_id === c.id) || [];
                return {
                    ...c,
                    chat_participants: parts.map((p) => ({
                        user_id: p.user_id,
                        users: usersMap.get(p.user_id)
                    }))
                };
            });

            // 3. Construir los items desencryptando el último mensaje
            const items: ChatInboxItem[] = [];

            for (const chat of assembledChats) {
                // El "contacto" es el otro participante (no yo)
                const otherParticipant = (chat.chat_participants as any[])
                    .find((p: any) => p.user_id !== myUserId);

                let contact;
                if (!otherParticipant?.users) {
                    console.warn(`[getInbox] ⚠️ No se pudo obtener el otro participante para el chat ${chat.id}. ¿Problemas de RLS en chat_participants o users?`, chat.chat_participants);
                    contact = {
                        id: 'unknown',
                        username: 'desconocido',
                        display_name: 'Usuario Desconocido',
                        profile_picture_url: null,
                    };
                } else {
                    contact = otherParticipant.users as {
                        id: string;
                        username: string;
                        display_name: string;
                        profile_picture_url: string | null;
                        is_verified?: boolean;
                    };
                }

                // 3a. Último mensaje — query independiente por chat
                //     (funciona correctamente aunque el chat no tenga mensajes)
                const { data: lastRaw } = await supabase
                    .from('chat_content')
                    .select('id, content, sender_id, created_at')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let lastMessage: DecryptedMessage | null = null;

                if (lastRaw && myDeviceId) {
                    const hasKey = await asegurarLlaveEnBunker(chat.id, myDeviceId);
                    const plainText = hasKey
                        ? await decryptMessage(lastRaw.content, chat.id)
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

                // Contar no leídos: consulta dedicada para evitar el sesgo del LIMIT 1
                const myParticipation = participations.find((p) => p.chat_id === chat.id);
                const lastReadAt = myParticipation?.last_read_at;
                let unread = 0;
                if (lastReadAt) {
                    const { count } = await supabase
                        .from('chat_content')
                        .select('*', { count: 'exact', head: true })
                        .eq('chat_id', chat.id)
                        .neq('sender_id', myUserId)
                        .gt('created_at', lastReadAt);
                    unread = count ?? 0;
                } else if (!lastReadAt) {
                    // Nunca ha leído → todos los mensajes del contacto son no leídos
                    const { count } = await supabase
                        .from('chat_content')
                        .select('*', { count: 'exact', head: true })
                        .eq('chat_id', chat.id)
                        .neq('sender_id', myUserId);
                    unread = count ?? 0;
                }

                items.push({
                    chat_id: chat.id,
                    chat_type: chat.type,
                    chat_name: chat.name,
                    contact,
                    last_message: lastMessage,
                    unread_count: unread,
                    // Chats sin mensajes van al final usando la fecha actual como fallback
                    updated_at: lastRaw?.created_at ?? new Date(0).toISOString(),
                });
            }

            // Ordenar por actividad más reciente (último mensaje o creación del chat)
            return items.sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
        } catch (e) {
            console.error('[MessageService] Error en getInbox:', e);
            return [];
        }
    },

    /**
     * Obtiene los mensajes de un chat y los desencripta.
     * @param cursor  ISO timestamp del mensaje más antiguo ya cargado (para paginación).
     *                Omitir en la primera carga.
     * @param limit   Número de mensajes por página (por defecto 40).
     */
    async getMessages(
        chatId: string,
        myUserId: string,
        cursor?: string,
        limit = 40,
    ): Promise<DecryptedMessage[]> {
        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) return [];

            // 1. Obtener mensajes ordenados (más reciente primero)
            //    Si hay cursor, traer solo mensajes MÁS ANTIGUOS que él (paginación infinita hacia arriba)
            let query = supabase
                .from('chat_content')
                .select('id, chat_id, content, sender_id, created_at')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (cursor) {
                query = query.lt('created_at', cursor);
            }

            const { data, error } = await query;
            if (error || !data) return [];

            // 2. Asegurar la llave AES del chat en la bóveda nativa
            const hasKey = await asegurarLlaveEnBunker(chatId, myDeviceId);

            // 3. Descifrar todos en paralelo
            const decrypted = await Promise.all(
                data.map(async (msg) => {
                    const plain = hasKey
                        ? await decryptMessage(msg.content, chatId)
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
        senderDisplayName?: string,
    ): Promise<DecryptedMessage | null> {
        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) throw new Error('No device ID');

            const hasKey = await asegurarLlaveEnBunker(chatId, myDeviceId);
            if (!hasKey) throw new Error('No AES key for chat');

            const encrypted = await encryptMessage(plainText, chatId);
            if (!encrypted) throw new Error('Encryption failed');

            const { data, error } = await supabase
                .from('chat_content')
                .insert({ chat_id: chatId, sender_id: senderId, content: encrypted })
                .select('id, chat_id, content, sender_id, created_at')
                .single();

            if (error) throw error;

            // ── Notificación push: fire & forget ────────────────────────────
            // Mandamos el contenido CIFRADO en el campo data (nunca texto plano)
            // El servidor filtra tokens de desarrollo automáticamente
            fetch('https://api.periodiconaranja.es/agoras/notificacion/mensaje', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    sender_id: senderId,
                    sender_name: senderDisplayName ?? 'Agora',
                    encrypted_preview: encrypted,
                }),
            }).catch((e) => console.warn('[MessageService] Push notification failed (non-critical):', e));

            return {
                id: data.id,
                chat_id: data.chat_id,
                sender_id: data.sender_id,
                content_encrypted: data.content,
                content: plainText,
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
        onError?: (status: string) => void,
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
                    const hasKey = myDeviceId ? await asegurarLlaveEnBunker(chatId, myDeviceId) : false;
                    const plain = hasKey
                        ? await decryptMessage(raw.content, chatId)
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
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn(`[MessageService] Canal Realtime en error (${status}):`, err?.message ?? err);
                    onError?.(status);
                } else if (status === 'SUBSCRIBED') {
                    console.log(`[MessageService] Canal Realtime suscrito: ${chatId}`);
                }
            });

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

    /**
     * Crea un chat directo (follow mutuo) o una solicitud de chat (follow no mutuo).
     * Distribuye la llave AES cifrada a cada dispositivo de ambos participantes.
     */
    async createChat(
        myUserId: string,
        targetUserId: string,
        myDeviceId: string,
    ): Promise<import('@/Types/Chats').ChatCreationResult> {
        try {
            console.log(`[createChat] ▶ Inicio | yo: ${myUserId} → target: ${targetUserId}`);

            // ── 0. ¿Ya existe un chat entre estos dos? ──────────────────────
            const { data: existing, error: existErr } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', myUserId)
                .is('left_at', null);

            console.log(`[createChat] 0. Mis participaciones: ${existing?.length ?? 0} | error: ${existErr?.message ?? 'ninguno'}`);

            if (existing?.length) {
                const myChats = existing.map((p) => p.chat_id);
                const { data: shared } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .eq('user_id', targetUserId)
                    .in('chat_id', myChats)
                    .is('left_at', null)
                    .limit(1);

                if (shared?.[0]) {
                    console.log(`[createChat] ♻️ Chat existente encontrado: ${shared[0].chat_id}`);
                    return { type: 'existing', chat_id: shared[0].chat_id };
                }
            }

            // ── 1. Comprobar follow mutuo ───────────────────────────────────
            const [{ data: iFollow, error: fErr1 }, { data: theyFollow, error: fErr2 }] = await Promise.all([
                supabase
                    .from('follows')
                    .select('follower_id')
                    .eq('follower_id', myUserId)
                    .eq('following_id', targetUserId)
                    .maybeSingle(),
                supabase
                    .from('follows')
                    .select('follower_id')
                    .eq('follower_id', targetUserId)
                    .eq('following_id', myUserId)
                    .maybeSingle(),
            ]);

            const isMutual = !!iFollow && !!theyFollow;
            console.log(`[createChat] 1. Follow mutuo: ${isMutual} | yo→él: ${!!iFollow} | él→yo: ${!!theyFollow} | errors: ${fErr1?.message ?? '-'}, ${fErr2?.message ?? '-'}`);

            // ── 2. SIEMPRE crear el chat + distribución E2EE ────────────────
            // (Independientemente de si es mutuo o no, el chat se crea)
            if (!AgoraBunker) {
                console.error('[createChat] ❌ AgoraBunker no disponible');
                throw new Error('AgoraBunker no disponible');
            }

            // Crear el chat primero para tener el ID, ya que la llave AES ahora se ancla al ID
            const { data: chat, error: chatErr } = await supabase
                .from('chats')
                .insert({ type: 'direct' })
                .select('id')
                .single();

            if (chatErr || !chat) {
                console.error('[createChat] ❌ Error creando chat:', chatErr?.message);
                throw chatErr ?? new Error('No se pudo crear el chat');
            }
            console.log(`[createChat] 2. Chat creado: ${chat.id}`);

            // Ahora le pedimos al Búnker que genere una llave y se la guarde para este chat
            await AgoraBunker.generarLlaveAESParaChat(chat.id);
            chatsVerificadosEnBunker.add(chat.id);
            console.log(`[createChat] 3. Llave AES generada en Búnker Nativo.`);

            // Añadir participantes
            const { error: partErr } = await supabase.from('chat_participants').insert([
                { chat_id: chat.id, user_id: myUserId },
                { chat_id: chat.id, user_id: targetUserId },
            ]);
            if (partErr) {
                console.error('[createChat] ❌ Error participantes:', partErr.message);
                throw partErr;
            }
            console.log(`[createChat] 4. Participantes insertados OK`);

            // Distribución de llaves E2EE
            const { data: devices, error: rpcError } = await supabase
                .rpc('get_public_keys_for_users', {
                    target_user_ids: [myUserId, targetUserId]
                });
            if (rpcError) {
                console.error("[createChat] Error en el RPC get_public_keys_for_users:", rpcError);
            }

            console.log(`[createChat] 5. Dispositivos con public_key: ${devices?.length ?? 0}`);

            const keyInserts: { chat_id: string; device_id: string; encripted_key: string }[] = [];

            await Promise.all(
                (devices ?? []).map(async (device: any) => {
                    if (!device.public_device_key || device.is_banned) return;
                    try {
                        const encryptedKey: string = await AgoraBunker.exportarLlaveAESCifrada(
                            chat.id,
                            device.public_device_key,
                        );
                        keyInserts.push({
                            chat_id: chat.id,
                            device_id: device.id,
                            encripted_key: encryptedKey,
                        });
                    } catch (e) {
                        console.warn(`[createChat] ⚠️ Fallo exportando llave cifrada para device ${device.id}:`, e);
                    }
                })
            );

            if (keyInserts.length > 0) {
                const { error: keyErr } = await supabase.from('chat_encripted_key').insert(keyInserts);
                if (keyErr) console.error('[createChat] ❌ Error insertando llaves:', keyErr.message);
                else console.log(`[createChat] 6. Llaves distribuidas: ${keyInserts.length}`);
            }

            // ── 3. Si NO es mutuo → además meter en chat_requests ───────────
            //   Si el receptor rechaza → se borra el chat entero (DELETE cascade)
            if (!isMutual) {
                console.log(`[createChat] 7. No mutuo → insertando chat_request...`);
                const { error: reqErr } = await supabase
                    .from('chat_requests')
                    .insert({
                        chat_id: chat.id,
                        sender_id: myUserId,
                        receiver_id: targetUserId,
                    });

                if (reqErr) {
                    console.warn('[createChat] ⚠️ Error insertando chat_request:', reqErr.message);
                }
            }

            const resultType = isMutual ? 'direct' : 'request';
            console.log(`[createChat] ✅ Chat E2EE creado (${resultType}): ${chat.id}`);
            return { type: resultType, chat_id: chat.id };

        } catch (e) {
            console.error('[createChat] 💥 EXCEPCIÓN:', e);
            return null;
        }
    },

    /**
     * Sincroniza (cifra y envía) las llaves AES de todos mis chats a un dispositivo nuevo de mi propia cuenta.
     */
    async syncKeysToNewDevice(myUserId: string, newDbDeviceId: string, newDevicePublicKey: string): Promise<void> {
        if (!AgoraBunker) return;
        try {
            console.log(`[MessageService] Iniciando sincronización de llaves para el nuevo dispositivo: ${newDbDeviceId}`);
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier');
            if (!myDeviceId) return;

            // 1. Obtener todos los chats activos en los que participo
            const { data: participations, error } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', myUserId)
                .is('left_at', null);

            if (error || !participations?.length) return;

            const keyInserts: { chat_id: string; device_id: string; encripted_key: string }[] = [];

            // 2. Iterar sobre cada chat y cifrar la llave
            for (const p of participations) {
                // Asegurar que tenemos la llave localmente
                const hasKey = await asegurarLlaveEnBunker(p.chat_id, myDeviceId);
                if (!hasKey) continue; // Si no tengo acceso a este chat, lo salto

                try {
                    // Exportar la llave AES cifrada con la clave pública RSA del dispositivo NUEVO
                    const encryptedKey = await AgoraBunker.exportarLlaveAESCifrada(p.chat_id, newDevicePublicKey);
                    keyInserts.push({
                        chat_id: p.chat_id,
                        device_id: newDbDeviceId,
                        encripted_key: encryptedKey,
                    });
                } catch (e) {
                    console.warn(`[MessageService] Error cifrando llave para el chat ${p.chat_id}:`, e);
                }
            }

            // 3. Subir las llaves para el nuevo dispositivo
            if (keyInserts.length > 0) {
                const { error: insErr } = await supabase.from('chat_encripted_key').insert(keyInserts);
                if (insErr) {
                    console.error('[MessageService] Error subiendo llaves sincronizadas:', insErr.message);
                } else {
                    console.log(`[MessageService] ✅ Sincronización exitosa: ${keyInserts.length} llaves enviadas al dispositivo ${newDbDeviceId}`);
                }
            } else {
                console.log(`[MessageService] No hubo llaves para sincronizar.`);
            }
        } catch (e) {
            console.error('[MessageService] Error general en syncKeysToNewDevice:', e);
        }
    },

    timeAgo,
};

