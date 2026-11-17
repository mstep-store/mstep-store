import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { AuthContext } from "./authContextValue";

async function fetchIsAdmin(userId) {
    const { data, error } = await supabase
        .from("store_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error checking admin access:", error);
        return false;
    }

    return Boolean(data);
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Remember which user we already verified so token refreshes
    // don't trigger another admin check (or flash a loader).
    const verifiedUserId = useRef(null);

    useEffect(() => {
        let active = true;

        async function applySession(nextSession) {
            if (!active) return;

            const userId = nextSession?.user?.id ?? null;

            if (userId && userId === verifiedUserId.current) {
                setSession(nextSession);
                return;
            }

            if (!userId) {
                verifiedUserId.current = null;
                setSession(null);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            setLoading(true);
            setSession(nextSession);

            const admin = await fetchIsAdmin(userId);

            if (!active) return;

            verifiedUserId.current = userId;
            setIsAdmin(admin);
            setLoading(false);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            // Don't call Supabase directly inside this callback (can deadlock).
            setTimeout(() => applySession(nextSession), 0);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            throw error;
        }
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    }, []);

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            isAdmin,
            loading,
            signIn,
            signOut,
        }),
        [session, isAdmin, loading, signIn, signOut]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
