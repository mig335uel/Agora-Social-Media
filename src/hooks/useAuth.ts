import { useState } from "react";
import { supabase } from "../lib/supbase/supabase";
import { Usuario } from "../Types/Users";



export default async function useAuth() {
    const [usuario, setUsuario] = useState<Promise<Usuario>>();



    if (supabase.auth.getSession() !== null) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {

            try {
                const { data, error } = await supabase.schema('public').from('users').select('*').eq('id', user.id).maybeSingle();

                if (error) throw error;

                if(data){
                    setUsuario(data);
                    return usuario;
                }
            } catch (error) {
                console.log(error);
                throw error;
            }





        }
    }


}

