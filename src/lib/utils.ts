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