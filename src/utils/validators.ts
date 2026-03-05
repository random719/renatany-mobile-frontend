export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const getEmailError = (email: string): string | undefined => {
  if (!email) return 'Email is required';
  if (!isValidEmail(email)) return 'Enter a valid email address';
  return undefined;
};

export const getPasswordError = (password: string): string | undefined => {
  if (!password) return 'Password is required';
  if (!isValidPassword(password)) return 'Password must be at least 6 characters';
  return undefined;
};

export const getNameError = (name: string): string | undefined => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  return undefined;
};

export const getConfirmPasswordError = (password: string, confirm: string): string | undefined => {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return undefined;
};
