import { useAuthStore } from "../stores/authStore";
import { Navigate } from "react-router-dom";

export function LoginPage() {
    const { signInWithGoogle, signInWithGithub, devLogin, isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="h-screen bg-terminal-bg flex items-center justify-center">
            <div className="bg-terminal-surface p-8 rounded-lg border border-terminal-border">
                <h1 className="font-pixel text-terminal-cyan text-sm mb-6">LOGIN</h1>
                
                <button
                    onClick={signInWithGoogle}
                    className="w-full p-3 bg-terminal-cyan/20 border border-terminal-cyan rounded mb-3"
                >
                    Sign in with Google
                </button>
                
                <button
                    onClick={signInWithGithub}
                    className="w-full p-3 bg-terminal-surface border border-terminal-border rounded"
                >
                    Sign in with GitHub
                </button>

                {import.meta.env.DEV && (
                    <button
                        onClick={devLogin}
                        className="w-full p-3 mt-3 bg-red-500/20 border border-red-500 rounded text-red-400"
                    >
                        Dev Login (Admin)
                    </button>
                )}
            </div>
        </div>
    );
}