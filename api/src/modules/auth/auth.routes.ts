import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './auth.controller.ts';

const esquemaLogin = z.object({ email: z.string().trim().min(1), senha: z.string().min(1) });

export const authRoutes = Router();
authRoutes.post('/login', validar({ body: esquemaLogin }), controller.login);
authRoutes.get('/me', autenticar, controller.me);
