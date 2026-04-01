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


export async function FollowsPrivateUsers(userId: string) {
  const user = useAuth();

  try {
    const { data, error } = await supabase.from('follow_requests').insert({
      requester_id: user?.id,
      requested_id: userId
    });

    if (error) throw error;

    if (data) {
      const payload: Notifications = {
        username: user?.username || "Alguien",
        title: "Nueva solicitud de seguimiento",
        body: `${user?.username || "Alguien"} ha solicitado seguirte.`,
        user_id: userId
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

  }

}
