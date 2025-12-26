import { AppError } from "./app-error";

export type ScheduleInput = {
  start: string;
  end: string;
  stepMinutes?: number;
};

export function buildSlotsFromSchedule(schedule: ScheduleInput) {
  const stepMinutes = schedule.stepMinutes ?? 30;

  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new AppError("Invalid slot step", 400);
  }

  const startMinutes = toMinutes(schedule.start);
  const endMinutes = toMinutes(schedule.end);

  if (endMinutes <= startMinutes) {
    throw new AppError("End time must be after start time", 400);
  }

  const slots: {
    label: string;
    startsAt: string;
    endsAt: string;
    sortOrder: number;
  }[] = [];

  let order = 0;
  for (let start = startMinutes; start < endMinutes; start += stepMinutes) {
    const slotEnd = Math.min(start + stepMinutes, endMinutes);
    const startsAt = toTimeString(start);
    const endsAt = toTimeString(slotEnd);

    slots.push({
      label: `${startsAt} - ${endsAt}`,
      startsAt,
      endsAt,
      sortOrder: order++,
    });
  }

  return slots;
}

function toMinutes(time: string) {
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new AppError("Invalid time format", 400);
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new AppError("Invalid time format", 400);
  }

  return hours * 60 + minutes;
}

function toTimeString(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
