const CALENDAR_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const UTC_MIDNIGHT_SUFFIX = /T00:00:00(?:\.000)?Z$/;

const extractCalendarDateParts = (value: string) => {
  const match = value.match(CALENDAR_DATE_PREFIX);
  if (!match) return null;

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
};

export const parseRentalCalendarDate = (value: string): Date => {
  const parts = extractCalendarDateParts(value);
  if (!parts) return new Date(value);

  return new Date(parts.year, parts.monthIndex, parts.day);
};

export const parseRentalBoundaryDate = (value: string): Date => {
  if (!value) return new Date(NaN);

  if (CALENDAR_DATE_PREFIX.test(value) && (value.length === 10 || UTC_MIDNIGHT_SUFFIX.test(value))) {
    return parseRentalCalendarDate(value);
  }

  return new Date(value);
};

