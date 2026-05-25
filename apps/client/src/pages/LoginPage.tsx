import React, { useState } from "react";
import { useAuthStore } from "../store/auth";
import api from "../services/api";


export const LoginPage: React.FC = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Hit your backend authentication route
            const response = await api.post("/api/v1/login", { email, password });
            
            // Extract the user data and the token from the server response
            const { user, accessToken } = response.data;
            
            // Update your global Zustand state & localStorage automatically
            setAuth(user, accessToken);

        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.response?.data?.message || "Invalid email or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.card}>
                <h2 style={styles.heading}>Sign In</h2>
                <p style={styles.subheading}>Enter your credentials to access your dashboard</p>

                {error && <div style={styles.errorBox}>{error}</div>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input} 
                        placeholder="you@example.com"
                        required 
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input} 
                        placeholder="••••••••"
                        required 
                    />
                </div>

                <button type="submit" disabled={isLoading} style={styles.loginButton}>
                    {isLoading ? "Signing in..." : "Sign In"}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "sans-serif",
    },
    card: {
        background: "#fff",
        padding: "2.5rem",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px",
    },
    heading: { color: "#1f2937", marginBottom: "0.25rem", textAlign: "center" as const },
    subheading: { color: "#6b7280", fontSize: "0.85rem", marginBottom: "1.5rem", textAlign: "center" as const },
    errorBox: {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
        padding: "0.75rem",
        borderRadius: "6px",
        fontSize: "0.85rem",
        marginBottom: "1rem",
        border: "1px solid #fca5a5",
    },
    inputGroup: { marginBottom: "1.25rem" },
    label: { display: "block", fontSize: "0.85rem", fontWeight: "600" as const, color: "#374151", marginBottom: "0.4rem" },
    input: {
        width: "100%",
        padding: "0.65rem 0.75rem",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        fontSize: "0.95rem",
        boxSizing: "border-box" as const,
        outline: "none",
    },
    loginButton: {
        width: "100%",
        padding: "0.75rem",
        backgroundColor: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: "bold" as const,
        cursor: "pointer",
        marginTop: "0.5rem",
        transition: "background 0.2s",
    },
};