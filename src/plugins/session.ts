import fp from "fastify-plugin";
import fastifySession from "@fastify/session";
import type { FastifyPluginAsync } from "fastify";
import type { FastifySessionOptions, SessionStore } from "@fastify/session";

export interface AppSessionOptions {
  cookieName: string;
  secret: string;
  ttl: number;
  store?: SessionStore | null;
  disableTimeout: boolean;
}

export const sessionSetup: FastifyPluginAsync<AppSessionOptions> = async (
  fastify,
  options,
) => {
  const sessionOptions: FastifySessionOptions = {
    secret: options.secret,
    cookieName: options.cookieName,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
    saveUninitialized: false,
  };

  // Handle timeout/TTL logic cleanly
  if (options.disableTimeout) {
    sessionOptions.cookie!.maxAge = undefined;
  } else {
    sessionOptions.cookie!.maxAge = options.ttl;
  }

  if (options.store) {
    sessionOptions.store = options.store;
  }

  await fastify.register(fastifySession, sessionOptions);
};

export default fp(sessionSetup, { name: "app-session" });
