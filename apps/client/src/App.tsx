import React, { useEffect } from "react";
import { useAuthStore } from "./store/auth";
import api from "./services/api";
import { MapCanvas } from "./pages/MapCanvas";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isInitializing = useAuthStore((state) => state.isInitializing);
    // Grab user and token from store state to pass to MapCanvas props
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token || localStorage.getItem("accessToken"));
    
    const setAuth = useAuthStore((state) => state.setAuth);
    const setInitializing = useAuthStore((state) => state.setInitializing);
    const logout = useAuthStore((state) => state.logout);

    useEffect(() => {
        const checkExistingSession = async () => {
            const storedToken = localStorage.getItem("accessToken");
            if (!storedToken) {
                setInitializing(false);
                return;
            }
            try {
                const response = await api.get("/api/v1/profile");
                setAuth(response.data.user, storedToken);
            } catch (err) {
                logout();
            }
        };
        checkExistingSession();
    }, [setAuth, setInitializing, logout]);

    if (isInitializing) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1e293b", color: "#fff" }}>
                <h3>Loading secure session...</h3>
            </div>
        );
    }

    // Pass the required props down to the MapCanvas component
    return isAuthenticated ? (
        <MapCanvas 
            serverUrl="http://localhost:5000" // Matches your backend port 
            token={token || ""} 
            currentUsername={user?.username || "Explorer"} 
        />
    ) : (
        <LoginPage />
    );
}