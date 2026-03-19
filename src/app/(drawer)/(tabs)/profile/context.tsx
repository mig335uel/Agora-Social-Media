import { createContext, useContext } from "react";

export const ProfileRefreshContext = createContext<{ 
    refreshStats: () => Promise<void>; 
    setRefreshStats: (fn: () => Promise<void>) => void;
}>({ 
    refreshStats: async () => {}, 
    setRefreshStats: () => {}
});

export const useProfileRefresh = () => useContext(ProfileRefreshContext);
