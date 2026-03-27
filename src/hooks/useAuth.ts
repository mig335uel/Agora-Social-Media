import { useEffect, useState } from "react";
import { supabase } from "../lib/supbase/supabase";
import { Usuario } from "../Types/Users";



export default function useAuth() {
    const [usuario, setUsuario] = useState<Usuario | null>(null);

    useEffect(() => {
        const getUserData = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (error) console.error("Error fetching user data:", error);
                if (data) setUsuario(data);
            } catch (err) {
                console.error("Unexpected error in useAuth:", err);
            }
        };

        // 1. Carga inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                getUserData(session.user.id);
            } else {
                setUsuario(null);
            }
        });

        // 2. Escuchar cambios de sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                getUserData(session.user.id);
            } else {
                setUsuario(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return usuario;
}

