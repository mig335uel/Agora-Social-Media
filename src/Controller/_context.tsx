import { createContext, useContext, Dispatch, SetStateAction } from "react";

export const ProfileRefreshContext = createContext<{ 
    refreshStats: () => Promise<void>; 
    setRefreshStats: Dispatch<SetStateAction<() => Promise<void>>>;
}>({ 
    refreshStats: async () => {}, 
    setRefreshStats: () => {}
});

export const useProfileRefresh = () => useContext(ProfileRefreshContext);
export default function ContextRoute() { return null; }
