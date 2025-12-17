import { AppError } from "./app-error";

export function normalizeDate(date: string) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Invalid date provided", 400)
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function combineDateWithTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new AppError("Invalid time format", 400)
  }

  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)

  return combined
}

export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
