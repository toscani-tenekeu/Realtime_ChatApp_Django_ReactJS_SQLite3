export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

export function validateEmail(v: string): string | undefined {
  if (!v) return "Email is required.";
  if (!emailRegex.test(v)) return "Enter a valid email address.";
}

export function validateUsername(v: string): string | undefined {
  if (!v) return "Username is required.";
  if (!usernameRegex.test(v)) return "3–20 letters, numbers or underscores.";
}

export function validatePassword(v: string): string | undefined {
  if (!v) return "Password is required.";
  if (v.length < 8) return "Password must be at least 8 characters.";
}

export function validateDisplayName(v: string): string | undefined {
  if (!v.trim()) return "Display name is required.";
  if (v.trim().length < 2) return "At least 2 characters.";
}
