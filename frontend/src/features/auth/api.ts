export interface User {
  id: number;
  email: string;
  name?: string | null;
}

export async function login(
  email: string,
  password: string
): Promise<User> {
  const response = await fetch(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Login failed"
    );
  }

  return result.user;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const response = await fetch(
    "http://localhost:3000/api/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Registration failed"
    );
  }

  return result.user;
}


export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(
    "http://localhost:3000/api/auth/me",
    {
      credentials: "include",
    }
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to check authentication");
  }

  const result = await response.json();

  return result.user;
}

export async function logout(): Promise<void> {
  const response = await fetch(
    "http://localhost:3000/api/auth/logout",
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}