export const getCurrencyForLocale = (language: string): string => {
  switch (language) {
    case 'fr':
    case 'de':
    case 'es':
      return 'EUR';
    default:
      return 'USD';
  }
};

export const getCurrencySymbol = (language: string): string => {
  switch (language) {
    case 'fr':
    case 'de':
      return '€';
    case 'es':
      return '€';
    default:
      return '$';
  }
};

export const formatCurrency = (amount: number, language: string): string => {
  const symbol = getCurrencySymbol(language);
  const currency = getCurrencyForLocale(language);
  try {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${symbol}${amount.toFixed(2)}`;
  }
};
