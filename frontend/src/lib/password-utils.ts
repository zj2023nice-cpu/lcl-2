export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordAnalysis {
  strength: PasswordStrength;
  score: number;
  suggestions: string[];
  isCommonPassword: boolean;
  isSimilarToAccount: boolean;
}

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja', 'mustang',
  'password1', 'password123', 'admin', 'login', 'princess', 'azerty', '111111',
  '000000', '1234', '12345', '1234567890', 'test', 'test123', 'hello',
  'charlie', 'donald', 'freedom', 'whatever', 'class', 'cheese', 'magic',
  'rocket', 'killer', 'manager', 'batman', 'starwars', 'thomas', 'soccer',
  'hockey', 'george', 'chicken', 'andrew', 'jordan', 'michelle', 'daniel',
  'summer', 'love', 'forever', 'pepper', 'maverick', 'jennifer', 'zxcvbn',
  'asdfgh', 'zxcvbnm', 'qwertyuiop', 'asdfghjkl', '1q2w3e', '1q2w3e4r',
  'qwe123', '123qwe', 'a123456', '123456a', 'abcdef', 'abcdefg', '123abc',
  'p@ssw0rd', 'password!', 'passw0rd!', 'qwerty123', '123456789', '987654321',
];

const SIMILARITY_THRESHOLD = 0.5;

function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  return COMMON_PASSWORDS.some(
    (common) => lower === common || lower.includes(common)
  );
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length >= s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  let sequence = 0;
  let maxSequence = 0;
  for (let i = 0; i < shorter.length; i++) {
    for (let j = 0; j < longer.length; j++) {
      let k = 0;
      while (
        i + k < shorter.length &&
        j + k < longer.length &&
        shorter[i + k] === longer[j + k]
      ) {
        k++;
      }
      if (k > maxSequence) maxSequence = k;
    }
  }
  sequence = maxSequence;

  const charMatchScore = matches / longer.length;
  const sequenceScore = (sequence * sequence) / (longer.length * shorter.length);

  return Math.min(1, charMatchScore * 0.4 + sequenceScore * 0.6);
}

function isSimilarToAccount(password: string, accountName: string): boolean {
  if (!accountName) return false;
  return calculateSimilarity(password, accountName) >= SIMILARITY_THRESHOLD;
}

export function generatePassword(
  length = 16,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }

  return password;
}

export function analyzePassword(
  password: string,
  accountName = ''
): PasswordAnalysis {
  const suggestions: string[] = [];
  let score = 0;

  if (!password) {
    return {
      strength: 'empty',
      score: 0,
      suggestions: [],
      isCommonPassword: false,
      isSimilarToAccount: false,
    };
  }

  if (password.length < 8) {
    suggestions.push('密码长度至少为 8 位');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('添加小写字母');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('添加大写字母');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push('添加数字');
  }

  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/';~`]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('添加特殊字符');
  }

  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) {
    score += 1;
  } else {
    suggestions.push('增加字符多样性');
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    suggestions.push('避免连续重复字符');
  }

  if (/123|abc|qwe|asd|zxc|098|321|cba|poi|lkj|mnb/i.test(password)) {
    score = Math.max(0, score - 1);
    suggestions.push('避免键盘顺序字符');
  }

  const common = isCommonPassword(password);
  if (common) {
    score = Math.max(0, score - 2);
    suggestions.push('这是一个常见弱密码，请更换');
  }

  const similar = accountName ? isSimilarToAccount(password, accountName) : false;
  if (similar) {
    score = Math.max(0, score - 1);
    suggestions.push('密码与账号过于相似');
  }

  let strength: PasswordStrength;
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    strength,
    score,
    suggestions,
    isCommonPassword: common,
    isSimilarToAccount: similar,
  };
}

export function getStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    empty: '',
    weak: '弱',
    medium: '中',
    strong: '强',
  };
  return labels[strength];
}

export function getStrengthColorClass(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    empty: 'bg-theme-hover',
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  return colors[strength];
}

export function getStrengthTextClass(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    empty: 'text-theme-text-muted',
    weak: 'text-red-400',
    medium: 'text-yellow-400',
    strong: 'text-green-400',
  };
  return colors[strength];
}
