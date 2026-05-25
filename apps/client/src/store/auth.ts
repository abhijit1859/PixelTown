import { create } from "zustand"

interface User {
    id: string;
    email: string;
    username: string
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    setAuth: (user: User, token: string) => void;
    updateToken: (token: string) => void;
    logout: () => void;
    setInitializing: (isInitializing: boolean) => void
    setCurrentUser: (user: User) => void; // Added to set user info after validation
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    // 1. Immediately check if a token exists on page load
    isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
    // 2. Keep this true on startup if a token exists so we can validate it first
    isInitializing: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,

    setAuth: (user, token) => {
        localStorage.setItem('accessToken', token)
        set({ user, isAuthenticated: true, isInitializing: false })
    },

    updateToken: (token) => {
        localStorage.setItem("accessToken", token);
    },

    setCurrentUser: (user) => {
        set({ user, isAuthenticated: true, isInitializing: false });
    },

    logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken"); // Ensure refresh token is cleared too!
        set({ user: null, isAuthenticated: false, isInitializing: false })
    },

    setInitializing: (isInitializing) => set({ isInitializing })
}))