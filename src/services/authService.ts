// src/services/authService.ts
import axios from 'axios';

export async function login(email: string, password: string) {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    const res = await axios.post("/auth/login", {
      email: normalizedEmail,
      password,
    });
    return res.data; // should be { token }
  } catch (err: any) {
    throw err; // Let the component handle the error
  }
}


// src/services/authService.ts
export async function fetchDashboard() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token");

  const res = await fetch("/api/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Unauthorized");

  return res.json();
}
