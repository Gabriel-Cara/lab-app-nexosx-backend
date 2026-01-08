declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: string;
      condominiumId?: string | null;
    }
  }
}
