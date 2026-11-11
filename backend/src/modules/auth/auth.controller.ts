import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/http';
import * as authService from './auth.service';

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const me = await authService.getMe(req.user!.id);
  res.status(200).json(me);
});
