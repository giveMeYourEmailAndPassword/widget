// Форматирование даты для PocketBase
export const formatPbDate = (date: Date): string => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Форматирование даты для отображения
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Форматирование числа с разделителями тысяч
export const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU');
};

// Форматирование валюты
export const formatCurrency = (amount: number, currency: string): string => {
  return `${formatNumber(amount)} ${currency}`;
};

// Склонение слова "контракт"
export const contractWord = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  // Исключения для чисел от 11 до 19
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'контрактов';
  }

  // 1 контракт
  if (lastDigit === 1) {
    return 'контракт';
  }

  // 2, 3, 4 контракта
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'контракта';
  }

  // 5, 6, 7, 8, 9, 0 контрактов
  return 'контрактов';
};

// Работа с локальным хранилищем для авторизации
export const storageKeys = {
  USER_NICKNAME: 'widget_user_nickname',
  USER_ID: 'widget_user_id',
  USER_OFFICE_NAME: 'widget_user_office_name'
} as const;

export const saveUserNickname = (nickname: string): void => {
  localStorage.setItem(storageKeys.USER_NICKNAME, nickname);
};

export const getUserNickname = (): string | null => {
  return localStorage.getItem(storageKeys.USER_NICKNAME);
};

export const saveUserId = (userId: string): void => {
  localStorage.setItem(storageKeys.USER_ID, userId);
};

export const getUserId = (): string | null => {
  return localStorage.getItem(storageKeys.USER_ID);
};

export const saveUserOfficeName = (officeName: string): void => {
  localStorage.setItem(storageKeys.USER_OFFICE_NAME, officeName);
};

export const getUserOfficeName = (): string | null => {
  return localStorage.getItem(storageKeys.USER_OFFICE_NAME);
};

export const clearUserData = (): void => {
  localStorage.removeItem(storageKeys.USER_NICKNAME);
  localStorage.removeItem(storageKeys.USER_ID);
  localStorage.removeItem(storageKeys.USER_OFFICE_NAME);
};