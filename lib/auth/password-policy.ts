export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS = `Use at least ${PASSWORD_MIN_LENGTH} characters, including one uppercase letter, one lowercase letter, one number, and one symbol (such as ! or #).`;

const passwordSymbols = `!@#$%^&*()_+-=[]{};'\\:"|<>?,./\x60~`;

export function meetsPasswordRequirements(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    Array.from(password).some(character => passwordSymbols.includes(character));
}
