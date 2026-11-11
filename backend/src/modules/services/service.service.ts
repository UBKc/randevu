import { prisma } from '../../prisma';
import { AppError } from '../../utils/http';
import { CreateServiceInput, UpdateServiceInput } from './service.schemas';

export function listServices(includeInactive = false) {
  return prisma.service.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function getService(id: number) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError(404, 'Hizmet bulunamadı');
  return service;
}

export function createService(input: CreateServiceInput) {
  return prisma.service.create({
    data: {
      name: input.name,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      active: input.active ?? true,
    },
  });
}

export async function updateService(id: number, input: UpdateServiceInput) {
  await getService(id); // 404 kontrolü
  return prisma.service.update({ where: { id }, data: input });
}

export async function deleteService(id: number) {
  await getService(id);
  // Hizmet geçmiş randevularda kullanılıyorsa silmek yerine pasifleştiriyoruz.
  const usedCount = await prisma.appointment.count({ where: { serviceId: id } });
  if (usedCount > 0) {
    return prisma.service.update({ where: { id }, data: { active: false } });
  }
  await prisma.service.delete({ where: { id } });
  return { id, deleted: true };
}
