import 'fastify';

declare module 'fastify' {
  interface Session {
    searchTerm?: string;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      roles: string[];
      [key: string]: any;
    };
  }
}