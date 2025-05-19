// src/services/authService.ts
import axios from 'axios';

const API = 'http://localhost:4242'; // Backend URL

export async function login(email: string) {
  try {
    const res = await axios.post(`${API}/auth/login`, { email });
    return res.data; // { token }
  } catch (err: any) {
    throw err.response?.data?.error || 'Login failed';
  }
}
