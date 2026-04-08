import { LoginForm, RegisterForm } from "../Types/LoginForm";
import { supabase } from "../lib/supbase/supabase";
import { Usuario } from "../Types/Users";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
export async function RegisterAuth({ registerForm }: { registerForm: RegisterForm }) {
    try {
        // --- 1. VALIDACIÓN: ¿Existe ya el username? ---
        // Usamos .maybeSingle() o comprobamos el length del array
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', registerForm.username)
            .maybeSingle(); // Devuelve null si no existe, o el objeto si existe

        if (checkError) throw checkError;

        if (existingUser) {
            throw new Error('El nombre de usuario ya está en uso');
        }

        // --- 2. AUTH: Crear el usuario en Supabase Auth ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: registerForm.email,
            password: registerForm.password,
            options: {
                data: {
                    name: registerForm.name,
                    last_name: registerForm.last_name,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario en Auth");

        // --- 3. DATABASE: Insertar en tu tabla pública 'users' ---
        // Usamos el ID que generó Auth para que coincidan (vital para tu esquema)
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id, // Relación directa con Auth
                name: registerForm.name,
                last_name: registerForm.last_name,
                username: registerForm.username.toLowerCase(),
                display_name: registerForm.display_name,
                birth_date: registerForm.birth_date, // Tu campo DATE
                gender: registerForm.gender === "" ? null : registerForm.gender,
                is_private: false // Agora es privada por defecto
            })
            .select()
            .single();

        if (profileError) {
            // Si el perfil falla, podrías borrar el usuario de Auth (opcional)
            throw profileError;
        }
        return { user: authData.user, profile: profileData };

    } catch (error: any) {
        // Consologueamos el error para desarrollo pero lanzamos el mensaje para la UI
        console.error("Error en RegisterAuth:", error.message);
        throw error; // Lanzamos el error para que el componente lo capture
    }
}





export async function LoginAuth({ loginForm }: { loginForm: LoginForm }) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginForm.email,
            password: loginForm.password,
        });
        if (error) throw error;
        const { data: user, error: userError } = await supabase.schema('public').from('users').select('*').eq('id', data.user.id).single();

        if (userError) throw userError;


        return { user, session: data };
    } catch (error) {
        console.log(error);
        throw error;
    }
}




import { unregisterDevice } from "./NotificationService";

export async function signOut() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // Desvinculamos el hardware de forma segura antes de salir
            await unregisterDevice();
            
            // Cerramos la sesión en Supabase
            await supabase.auth.signOut();
        }
        return true;
    } catch (error) {
        console.log("Error en signOut:", error);
        throw error;
    }
}
