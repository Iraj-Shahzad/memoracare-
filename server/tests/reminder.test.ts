import { parseTimeToMinutes } from '../services/reminderScheduler';

describe('parseTimeToMinutes (reminder scheduler)', () => {
  it('parses 24-hour times', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('20:30')).toBe(1230);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('parses 12-hour AM/PM times', () => {
    expect(parseTimeToMinutes('9:00 AM')).toBe(540);
    expect(parseTimeToMinutes('12:00 PM')).toBe(720); // noon
    expect(parseTimeToMinutes('12:00 AM')).toBe(0); // midnight
    expect(parseTimeToMinutes('1:30 PM')).toBe(810);
  });

  it('returns null for invalid input', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('abc')).toBeNull();
    expect(parseTimeToMinutes('25:00')).toBeNull();
    expect(parseTimeToMinutes('09:75')).toBeNull();
    expect(parseTimeToMinutes(undefined as any)).toBeNull();
  });
});
