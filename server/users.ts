interface User {
  email: string;
  subscribed: boolean;
}

const users: User[] = [];

export function addUser(email: string) {
  const exists = users.find(u => u.email === email);
  if (!exists) users.push({ email, subscribed: true });
}

export function getUser(email: string): User | undefined {
  return users.find(u => u.email === email);
}
