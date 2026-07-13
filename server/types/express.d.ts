import 'express';

// Augment Express's Request with the custom properties our middleware sets.
declare global {
  namespace Express {
    interface Request {
      // Set by the `protect` auth middleware (a Mongoose User document).
      user?: any;
      // Set by the socket.io middleware in server.ts.
      io?: any;
    }
  }
}

export {};
