import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type AreaSeed = {
  name: string
  description: string
  capacity: number
  available?: boolean
  schedule: {
    start: string
    end: string
    stepMinutes?: number
  }
}

const AREAS: AreaSeed[] = [
  {
    name: "Churrasqueira",
    description: "Espaço coberto com churrasqueiras, mesas e cadeiras.",
    capacity: 40,
    schedule: {
      start: "08:00",
      end: "22:00",
    },
  },
  {
    name: "Salão de Festa",
    description:
      "Salão amplo com cozinha de apoio, ideal para confraternizações.",
    capacity: 120,
    schedule: {
      start: "09:00",
      end: "23:00",
    },
  },
  {
    name: "Quadra Multiesportiva",
    description:
      "Quadra coberta para jogos de futsal, vôlei e basquete (iluminada).",
    capacity: 24,
    schedule: {
      start: "07:00",
      end: "21:00",
    },
  },
]

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function toTimeString(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
  const minutes = String(totalMinutes % 60).padStart(2, "0")
  return `${hours}:${minutes}`
}

function buildSlots(area: AreaSeed) {
  const startMinutes = toMinutes(area.schedule.start)
  const endMinutes = toMinutes(area.schedule.end)
  const step = area.schedule.stepMinutes ?? 30

  const slots: {
    label: string
    startsAt: string
    endsAt: string
    sortOrder: number
  }[] = []

  let currentOrder = 0
  for (let start = startMinutes; start < endMinutes; start += step) {
    const slotEnd = Math.min(start + step, endMinutes)

    slots.push({
      label: `${toTimeString(start)} - ${toTimeString(slotEnd)}`,
      startsAt: toTimeString(start),
      endsAt: toTimeString(slotEnd),
      sortOrder: currentOrder++,
    })
  }

  return slots
}

async function main() {
  await prisma.areaReservation.deleteMany()
  await prisma.areaTimeSlot.deleteMany()
  await prisma.commonArea.deleteMany()

  for (const area of AREAS) {
    const createdArea = await prisma.commonArea.create({
      data: {
        name: area.name,
        description: area.description,
        capacity: area.capacity,
        available: area.available ?? true,
      },
    })

    const slots = buildSlots(area)

    if (slots.length > 0) {
      await prisma.areaTimeSlot.createMany({
        data: slots.map((slot) => ({
          ...slot,
          areaId: createdArea.id,
        })),
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log("Seed concluído com sucesso.")
  })
  .catch(async (error) => {
    console.error("Erro ao executar o seed:", error)
    await prisma.$disconnect()
    process.exit(1)
  })
