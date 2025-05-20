type User = {
  email: string;
  password: string;
  subscribed: boolean;
};

const users: Record<string, User> = {};

// Save new user with unsubscribed status
export function addUser(email: string, password: string): void {
  users[email] = { email, password, subscribed: false };
}

// Retrieve user by email
export function getUser(email: string): User | undefined {
  return users[email];
}

// Validate credentials
export function validateUser(email: string, password: string): boolean {
  const user = users[email];
  return !!user && user.password === password;
}

// Mark user as subscribed (used in webhook)
export function markUserSubscribed(email: string): void {
  const user = users[email];
  if (user) {
    user.subscribed = true;
  }
}
