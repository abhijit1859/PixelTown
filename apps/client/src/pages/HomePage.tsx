import React from "react";
import { useAuthStore } from "../store/auth";

export const HomePage: React.FC = () => {
    // Select only what we need from the store to prevent unnecessary re-renders
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.heading}>Welcome Back!</h1>
                <p style={styles.text}>You are successfully logged into your account.</p>
                
                <div style={styles.profileBox}>
                    <p><strong>Username:</strong> {user?.username}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>User ID:</strong> {user?.id}</p>
                </div>

                <button onClick={logout} style={styles.logoutButton}>
                    Log Out
                </button>
            </div>
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
        textAlign: "center" as const,
    },
    heading: { color: "#1f2937", marginBottom: "0.5rem" },
    text: { color: "#4b5563", fontSize: "0.95rem", marginBottom: "1.5rem" },
    profileBox: {
        textAlign: "left" as const,
        backgroundColor: "#f9fafb",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "2rem",
        fontSize: "0.9rem",
        color: "#374151",
    },
    logoutButton: {
        width: "100%",
        padding: "0.75rem",
        backgroundColor: "#dc2626",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: "bold" as const,
        cursor: "pointer",
        transition: "background 0.2s",
    },
};