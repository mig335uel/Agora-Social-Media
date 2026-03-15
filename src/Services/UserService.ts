import { supabase } from "../lib/supbase/supabase";
import { Usuario } from "../Types/Users";

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
