import { useContext } from "react";
import { AuthContext } from "../contexe/authContextValue";

export default function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }

    return context;
}
