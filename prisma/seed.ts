import { PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"

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

const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? process.env.MASTER_EMAIL ?? "admin@nexosx.com.br"
const PLATFORM_ADMIN_NAME = process.env.PLATFORM_ADMIN_NAME ?? process.env.MASTER_NAME ?? "Administrador"
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? process.env.MASTER_PASSWORD ?? "Admin123!"

const DEFAULT_CONDOMINIUM_CODE = process.env.SEED_CONDOMINIUM_CODE ?? "demo"
const DEFAULT_CONDOMINIUM_NAME = process.env.SEED_CONDOMINIUM_NAME ?? "Condomínio Demo"
const SEED_MANAGER_NAME = process.env.SEED_MANAGER_NAME ?? process.env.SEED_ADMIN_NAME ?? "Gestor Demo"
const SEED_MANAGER_EMAIL = process.env.SEED_MANAGER_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "manager@nexosx.com.br"
const SEED_MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "Manager123!"

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

async function ensurePlatformAdminUser() {
  const existing = await prisma.user.findFirst({
    where: { role: "admin" },
  })

  if (existing) {
    return existing
  }

  const passwordHash = await hash(PLATFORM_ADMIN_PASSWORD, 8)

  return prisma.user.create({
    data: {
      name: PLATFORM_ADMIN_NAME,
      email: PLATFORM_ADMIN_EMAIL,
      password: passwordHash,
      role: "admin",
    },
  })
}

async function ensureDemoManager(condominiumId: string) {
  const existing = await prisma.user.findFirst({
    where: { role: "manager", condominiumId },
  })

  if (existing) {
    return existing
  }

  const passwordHash = await hash(SEED_MANAGER_PASSWORD, 8)

  return prisma.user.create({
    data: {
      name: SEED_MANAGER_NAME,
      email: SEED_MANAGER_EMAIL,
      password: passwordHash,
      role: "manager",
      condominiumId,
    },
  })
}

async function main() {
  await ensurePlatformAdminUser()

  const condominium = await prisma.condominium.upsert({
    where: { code: DEFAULT_CONDOMINIUM_CODE },
    update: { name: DEFAULT_CONDOMINIUM_NAME },
    create: {
      name: DEFAULT_CONDOMINIUM_NAME,
      code: DEFAULT_CONDOMINIUM_CODE,
    },
  })

  await ensureDemoManager(condominium.id)

  await prisma.areaReservation.deleteMany({
    where: { condominiumId: condominium.id },
  })
  await prisma.areaTimeSlot.deleteMany({
    where: { condominiumId: condominium.id },
  })
  await prisma.commonArea.deleteMany({
    where: { condominiumId: condominium.id },
  })

  for (const area of AREAS) {
    const createdArea = await prisma.commonArea.create({
      data: {
        name: area.name,
        description: area.description,
        capacity: area.capacity,
        available: area.available ?? true,
        condominiumId: condominium.id,
      },
    })

    const slots = buildSlots(area)

    if (slots.length > 0) {
      await prisma.areaTimeSlot.createMany({
        data: slots.map((slot) => ({
          ...slot,
          areaId: createdArea.id,
          condominiumId: condominium.id,
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
