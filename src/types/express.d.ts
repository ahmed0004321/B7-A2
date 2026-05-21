declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        // add other fields your JWT payload has, e.g:
        // email: string;
        // role: string;
      };
    }
  }
}

export {};