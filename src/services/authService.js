// src/services/authService.ts
import axios from 'axios';
export async function login(email, password) {
    try {
        const res = await axios.post("http://localhost:4242/auth/login", {
            email,
            password,
        });
        return res.data; // should be { token }
    }
    catch (err) {
        throw err; // Let the component handle the error
    }
}
// src/services/authService.ts
export async function fetchDashboard() {
    const token = localStorage.getItem("token");
    if (!token)
        throw new Error("No token");
    const res = await fetch("http://localhost:4242/api/dashboard", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok)
        throw new Error("Unauthorized");
    return res.json();
}
