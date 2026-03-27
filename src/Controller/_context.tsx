import { createContext, useContext, Dispatch, SetStateAction } from "react";

export const ProfileRefreshContext = createContext<{ 
    refreshStats: () => Promise<void>; 
    setRefreshStats: Dispatch<SetStateAction<() => Promise<void>>>;
}>({ 
    refreshStats: async () => {}, 
    setRefreshStats: () => {}
});

export const useProfileRefresh = () => useContext(ProfileRefreshContext);

/**
 * Contexto secundario para conectar el pull-to-refresh del header (layout)
 * con la lógica de recarga que vive en el child de la tab (perfil/[id].tsx).
 */
export const ProfilePullRefreshContext = createContext<{
    refreshing: boolean;
    onRefresh: () => void;
    registerRefresh: (fn: () => void) => void;
}>({
    refreshing: false,
    onRefresh: () => {},
    registerRefresh: () => {},
});

export const useProfilePullRefresh = () => useContext(ProfilePullRefreshContext);

export default function ContextRoute() { return null; }
