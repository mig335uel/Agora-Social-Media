import useAuth from "@/hooks/useAuth";
import { supabase } from "../lib/supbase/supabase";
import { Usuario } from "../Types/Users";
interface Notifications {
  username: string;
  title: string;
  body: string;
  user_id?: string;
}

/**
 * Busca usuarios por su username para el sistema de menciones.
 * @param query Texto a buscar (sin el símbolo @)
 */
export async function searchUsers(query: string): Promise<Usuario[]> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error buscando usuarios:", error);
    return [];
  }
}
/**
 * Cambia el estado de seguimiento entre dos usuarios.
 * @param followerId ID del usuario que sigue
 * @param followingId ID del usuario a seguir
 * @returns boolean indicando si ahora lo sigue (true) o no (false)
 */
export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;

  try {
    // Verificar si ya lo sigue - Usamos select sin .single() para evitar errores si no existe
    const { data: existing, error: checkError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      // Dejar de seguir - Borramos todas las posibles duplas (limpieza por si acaso)
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (deleteError) throw deleteError;
      return false;
    } else {
      // Seguir
      const { error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        });

      // Si por una race condition ya se insertó, lo tratamos como "éxito" (ya lo sigue)
      if (insertError) {
        if (insertError.code === '23505') return true;
        throw insertError;
      }
      return true;
    }
  } catch (error) {
    console.error("Error en toggleFollow:", error);
    throw error;
  }
}

/**
 * Verifica si un usuario sigue a otro.
 */
export async function checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId || followerId === followingId) return false;

  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error en checkFollowStatus:", error);
    return false;
  }
}

/**
 * Actualiza el perfil de un usuario.
 * Permite actualizar solo los campos enviados en el objeto 'updates'.
 */
export async function updateUserProfile(userId: string, updates: Partial<Usuario>): Promise<Usuario | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}


export async function FollowsPrivateUsers(followerId: string, followingId: string) {
  try {
    const { data, error } = await supabase.from('follow_requests').insert({
      requester_id: followerId,
      requested_id: followingId
    }).select().single();

    if (error) throw error;

    if (data) {
      // Obtener datos del solicitante para la notificación
      const { data: requester } = await supabase.from('users').select('username').eq('id', followerId).single();

      const payload: Notifications = {
        username: requester?.username || "Alguien",
        title: "Nueva solicitud de seguimiento",
        body: `${requester?.username || "Alguien"} ha solicitado seguirte.`,
        user_id: followingId
      }
      await fetch('https://api.periodiconaranja.es/notificacion/requestfollow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    console.error("Error en FollowsPrivateUsers:", error);
    throw error;
  }
}


export async function FollowRequestAccept(followerId: string, followingId: string) {
  try {
    // followerId es quien pidió seguir (requester)
    // followingId es quien acepta (requested)
    const { data, error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingId
    }).select().single();

    if (error) throw error;

    if (data) {
      // Obtener datos del seguidor para la notificación
      const { data: follower } = await supabase.from('users').select('username').eq('id', followerId).single();

      const payload: Notifications = {
        username: follower?.username || "Alguien",
        title: "Solicitud de seguimiento aceptada",
        body: `${follower?.username || "Alguien"} ahora te sigue.`,
        user_id: followingId
      }
      await fetch('https://api.periodiconaranja.es/notificacion/requestfollow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Borrar la solicitud
      const { error: deleteError } = await supabase
        .from('follow_requests')
        .delete()
        .eq('requester_id', followerId)
        .eq('requested_id', followingId);

      if (deleteError) throw deleteError;
    }
  } catch (error) {
    console.error("Error en FollowRequestAccept:", error);
    throw error;
  }
}

/**
 * Verifica si existe una solicitud de seguimiento pendiente.
 */
export async function checkFollowRequestStatus(requesterId: string, requestedId: string): Promise<boolean> {
  if (!requesterId || !requestedId) return false;
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error en checkFollowRequestStatus:", error);
    return false;
  }
}

/**
 * Cancela una solicitud de seguimiento.
 */
export async function cancelFollowRequest(requesterId: string, requestedId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId);

    if (error) throw error;
  } catch (error) {
    console.error("Error en cancelFollowRequest:", error);
    throw error;
  }
}

// ─── Bloqueos ─────────────────────────────────────────────────────────────────

/**
 * Bloquea a un usuario.
 * Al bloquear también se eliminan los follows mutuos y las solicitudes pendientes.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  try {
    // 1. Insertar el bloqueo
    const { error: blockError } = await supabase
      .from('blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    // Ignorar el error de duplicado (ya bloqueado)
    if (blockError && blockError.code !== '23505') throw blockError;

    // 2. Eliminar follows mutuos en paralelo
    await Promise.all([
      supabase.from('follows')
        .delete()
        .eq('follower_id', blockerId)
        .eq('following_id', blockedId),
      supabase.from('follows')
        .delete()
        .eq('follower_id', blockedId)
        .eq('following_id', blockerId),
      // 3. Eliminar solicitudes de follow pendientes en ambas direcciones
      supabase.from('follow_requests')
        .delete()
        .or(`and(requester_id.eq.${blockerId},requested_id.eq.${blockedId}),and(requester_id.eq.${blockedId},requested_id.eq.${blockerId})`),
    ]);
  } catch (error) {
    console.error("Error en blockUser:", error);
    throw error;
  }
}

/**
 * Desbloquea a un usuario.
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;
  } catch (error) {
    console.error("Error en unblockUser:", error);
    throw error;
  }
}

/**
 * Verifica si el blocker ha bloqueado al blocked.
 */
export async function checkBlockStatus(blockerId: string, blockedId: string): Promise<boolean> {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  } catch (error) {
    console.error("Error en checkBlockStatus:", error);
    return false;
  }
}

/**
 * Devuelve la lista de user_ids que el usuario actual ha bloqueado.
 * Útil para filtrar feeds y búsquedas.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) throw error;
    return (data ?? []).map(row => row.blocked_id);
  } catch (error) {
    console.error("Error en getBlockedUserIds:", error);
    return [];
  }
}

// ─── Solicitudes de seguimiento ───────────────────────────────────────────────

export interface FollowRequest {
  requester_id: string;
  requested_id: string;
  created_at: string;
  requester: {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
    is_verified?: boolean;
  };
}

/**
 * Obtiene todas las solicitudes de seguimiento pendientes para un usuario.
 */
export async function getFollowRequests(userId: string): Promise<FollowRequest[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select(`
        requester_id,
        requested_id,
        created_at,
        requester:users!requester_id (
          id,
          username,
          display_name,
          profile_picture_url,
          is_verified
        )
      `)
      .eq('requested_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as FollowRequest[];
  } catch (error) {
    console.error("Error en getFollowRequests:", error);
    return [];
  }
}

/**
 * Rechaza una solicitud de seguimiento eliminándola de follow_requests.
 */
export async function rejectFollowRequest(requesterId: string, requestedId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId);

    if (error) throw error;
  } catch (error) {
    console.error("Error en rejectFollowRequest:", error);
    throw error;
  }
}