export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS = `Use at least ${PASSWORD_MIN_LENGTH} characters, including a letter and a number.`;

export function meetsPasswordRequirements(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /\p{L}/u.test(password) &&
    /[0-9]/.test(password);
}
