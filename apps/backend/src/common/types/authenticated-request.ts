import type { SessionUser } from '@restroos/types';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: SessionUser;
}
