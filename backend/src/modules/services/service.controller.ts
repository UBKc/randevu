import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/http';
import * as svc from './service.service';

export const listHandler = asyncHandler(async (req: Request, res: Response) => {
  // Yalnızca ADMIN pasif hizmetleri de görebilir.
  const includeInactive = req.user?.role === 'ADMIN' && req.query.all === 'true';
  const services = await svc.listServices(includeInactive);
  res.json(services);
});

export const getHandler = asyncHandler(async (req: Request, res: Response) => {
  const service = await svc.getService(Number(req.params.id));
  res.json(service);
});

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  const service = await svc.createService(req.body);
  res.status(201).json(service);
});

export const updateHandler = asyncHandler(async (req: Request, res: Response) => {
  const service = await svc.updateService(Number(req.params.id), req.body);
  res.json(service);
});

export const deleteHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.deleteService(Number(req.params.id));
  res.json(result);
});
