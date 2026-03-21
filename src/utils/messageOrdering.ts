import { Message } from '../types/models';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const parseDateValue = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseObjectIdTimestamp = (id: string) => {
  if (!OBJECT_ID_PATTERN.test(id)) return null;
  return parseInt(id.slice(0, 8), 16) * 1000;
};

export const getMessageOrderTimestamp = (message: Pick<Message, 'id' | 'created_date'>) =>
  parseObjectIdTimestamp(message.id) ?? parseDateValue(message.created_date);

export const sortMessagesChronologically = <T extends Pick<Message, 'id' | 'created_date'>>(
  messages: T[],
) =>
  [...messages].sort((a, b) => {
    const timeDiff = getMessageOrderTimestamp(a) - getMessageOrderTimestamp(b);
    if (timeDiff !== 0) return timeDiff;

    const createdDateDiff = parseDateValue(a.created_date) - parseDateValue(b.created_date);
    if (createdDateDiff !== 0) return createdDateDiff;

    return a.id.localeCompare(b.id);
  });
