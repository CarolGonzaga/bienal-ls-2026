export const BIENAL_START_DATE = "2026-09-04";
export const BIENAL_END_DATE = "2026-09-13";

const WEEKDAY_WINDOW = { min: "09:00", max: "22:00", label: "09h às 22h" };
const WEEKEND_WINDOW = { min: "10:00", max: "22:00", label: "10h às 22h" };
const LAST_DAY_WINDOW = { min: "10:00", max: "21:00", label: "10h às 21h" };

export const eventTimeWindow = (date) => {
  if (date === BIENAL_END_DATE) return LAST_DAY_WINDOW;
  if (!date) return WEEKDAY_WINDOW;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? WEEKEND_WINDOW : WEEKDAY_WINDOW;
};

export const validateEventTime = (date, startTime, endTime) => {
  if (!date || !startTime) return "";
  const window = eventTimeWindow(date);
  if (startTime < window.min || startTime > window.max)
    return `Neste dia, o horário inicial deve ficar entre ${window.label}.`;
  if (endTime && (endTime < window.min || endTime > window.max))
    return `Neste dia, o horário final deve ficar entre ${window.label}.`;
  if (endTime && endTime < startTime)
    return "O horário final não pode ser anterior ao horário inicial.";
  return "";
};
