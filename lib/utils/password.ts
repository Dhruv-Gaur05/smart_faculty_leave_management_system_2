/**
 * University Password Generator & Strength Assessment Utility
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too Short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  barColor: string;
  feedback: string;
}

/**
 * Generates an institutional-compliant secure password containing uppercase,
 * lowercase, numeric, and special character symbols.
 */
export function generateSecurePassword(prefix: string = 'Uni@'): string {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghjkmnpqrstuvwxyz';
  const numberChars = '23456789';
  const specialChars = '@#$!%*&';

  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

  // Guarantee at least one of each category
  const guaranteed = [
    uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length)),
    lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)),
    numberChars.charAt(Math.floor(Math.random() * numberChars.length)),
    specialChars.charAt(Math.floor(Math.random() * specialChars.length)),
  ];

  // Fill remaining characters up to length 10
  const remainingLength = 6;
  const randomPortion: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    randomPortion.push(allChars.charAt(Math.floor(Math.random() * allChars.length)));
  }

  // Shuffle the guaranteed + random portions
  const combined = [...guaranteed, ...randomPortion];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return `${prefix}${combined.join('')}`;
}

/**
 * Evaluates password complexity and returns strength metrics for UI feedback.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: 'Too Short',
      color: 'text-slate-400',
      barColor: 'bg-slate-200',
      feedback: 'Enter at least 6 characters.',
    };
  }

  if (password.length < 6) {
    return {
      score: 1,
      label: 'Too Short',
      color: 'text-rose-600',
      barColor: 'bg-rose-500',
      feedback: 'Must be at least 6 characters long.',
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) {
    return {
      score: 1,
      label: 'Weak',
      color: 'text-rose-600',
      barColor: 'bg-rose-500',
      feedback: 'Add numbers, symbols, and uppercase letters.',
    };
  }

  if (score === 2) {
    return {
      score: 2,
      label: 'Fair',
      color: 'text-amber-600',
      barColor: 'bg-amber-500',
      feedback: 'Fair strength. Adding special symbols will make it stronger.',
    };
  }

  if (score === 3 || score === 4) {
    return {
      score: 3,
      label: 'Good',
      color: 'text-blue-700',
      barColor: 'bg-blue-600',
      feedback: 'Good password. Meets institutional requirements.',
    };
  }

  return {
    score: 4,
    label: 'Strong',
    color: 'text-emerald-700',
    barColor: 'bg-emerald-600',
    feedback: 'Excellent! High-security institutional password.',
  };
}
