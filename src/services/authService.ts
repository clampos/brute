// src/services/authService.ts
import axios from 'axios';

const API = 'http://localhost:4242'; // Backend URL

export async function login(email: string, password: string) {
  const res = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw data.error || "Login failed";
  }

  return await res.json();
}
