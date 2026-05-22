import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyFormbody from "@fastify/formbody";
import fastifyView from "@fastify/view";
import nunjucks from "nunjucks";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Import our new custom plugin
import { journeyPlugin } from "./journey-plugin";

interface TabParams {
  Params: { tabId: string };
}

interface SearchPostRoute extends TabParams {
  Body: { searchId: string };
}

const fastify = Fastify({ logger: true });

// Register Official Plugins
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  secret: "a_very_long_and_secure_secret_key_that_is_at_least_32_characters",
  cookie: { secure: false },
  saveUninitialized: false,
});
fastify.register(fastifyFormbody);
fastify.register(fastifyView, {
  engine: { nunjucks },
  templates: path.join(process.cwd(), "views"),
});

// Register Our Custom Plugin (Must be registered AFTER @fastify/session)
fastify.register(journeyPlugin);

// Routes
fastify.get("/", async (request, reply) => {
  return reply.redirect(`/tab/${uuidv4()}`);
});

fastify.get<TabParams>("/tab/:tabId", async (request, reply) => {
  return reply.view("search.njk", { tabId: request.params.tabId });
});

// Using our decorators in the POST route
fastify.post<SearchPostRoute>("/tab/:tabId/search", async (request, reply) => {
  const { tabId } = request.params;
  const { searchId } = request.body;

  // Notice how clean this is! No checks for undefined journeyData, no timestamps.
  request.setJourney(tabId, { searchId });

  return reply.redirect(`/tab/${tabId}/result`);
});

// Using our decorators in the GET route
fastify.get<TabParams>("/tab/:tabId/result", async (request, reply) => {
  const { tabId } = request.params;

  // This safely returns the payload, OR undefined if it doesn't exist / expired
  const journey = request.getJourney(tabId);

  if (!journey || !journey.searchId) {
    // If the tab expired (30+ mins) or was never set, redirect back to start
    return reply.redirect(`/tab/${tabId}`);
  }

  return reply.view("result.njk", {
    tabId,
    searchId: journey.searchId,
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log("Server running");
});
