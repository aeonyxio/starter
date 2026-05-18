import { FastifyRequest, FastifyReply } from 'fastify';

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers['x-id-token'] as string;

  if (!token) {
    return reply.status(401).send('Unauthorized: Missing x-id-token header from Kong API Gateway.');
  }

  try {
    // A JWT comes in format header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const payloadBase64 = parts[1];
    const payloadBuffer = Buffer.from(payloadBase64, 'base64');
    const decoded = JSON.parse(payloadBuffer.toString('utf8'));

    req.user = decoded; // Contains user roles, groups, sub, etc.
  } catch (error) {
    req.log.error(error);
    return reply.status(401).send('Unauthorized: Invalid token');
  }
}