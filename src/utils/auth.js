// src/utils/auth.ts
export function isLoggedIn() {
    return !!localStorage.getItem("token");
}
