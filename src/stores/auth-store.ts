import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: AuthUser | null) => void;
    setLoading: (loading: boolean) => void;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: false,
            isAuthenticated: false,

            setUser: (user) => {
                set({ user, isAuthenticated: !!user });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            login: async (email, password) => {
                try {
                    const res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password }),
                    });

                    const data = await res.json();

                    if (data.success && data.data) {
                        set({ user: data.data, isAuthenticated: true });
                        return { success: true };
                    }

                    return { success: false, error: data.error || "เข้าสู่ระบบไม่สำเร็จ" };
                } catch {
                    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
                }
            },

            register: async (name, email, password) => {
                try {
                    const res = await fetch("/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, password }),
                    });

                    const data = await res.json();

                    if (data.success) {
                        // Auto login after registration
                        return await get().login(email, password);
                    }

                    return { success: false, error: data.error || "ลงทะเบียนไม่สำเร็จ" };
                } catch {
                    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
                }
            },

            logout: async () => {
                try {
                    await fetch("/api/auth/logout", { method: "POST" });
                } finally {
                    set({ user: null, isAuthenticated: false });
                }
            },

            checkAuth: async () => {
                set({ isLoading: true });
                try {
                    const res = await fetch("/api/auth/me");
                    const data = await res.json();

                    if (data.success && data.data) {
                        set({ user: data.data, isAuthenticated: true });
                    } else {
                        set({ user: null, isAuthenticated: false });
                    }
                } catch {
                    set({ user: null, isAuthenticated: false });
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: "kaquiz-auth",
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
