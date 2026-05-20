import { FastifyInstance } from 'fastify';
import { AppServices } from '../app.js';

export async function searchRoutes(app: FastifyInstance, options: { services: AppServices }) {
  const { citizen } = options.services;

  app.get('/', async (req, reply) => {
    return reply.view('search.njk', {
      user: req.user,
      error: req.query && (req.query as any).error
    });
  });

  app.post('/search', async (req, reply) => {
    const { searchTerm } = req.body as { searchTerm: string };
    
    if (!searchTerm || searchTerm.trim() === '') {
      return reply.redirect('/?error=empty');
    }

    req.session.searchTerm = searchTerm.trim();
    return reply.redirect('/results');
  });

  app.get('/results', async (req, reply) => {
    const searchTerm = req.session.searchTerm;
    if (!searchTerm) {
      return reply.redirect('/');
    }

    try {
      const results = await citizen.searchCitizens(searchTerm);
      return reply.view('results.njk', {
        user: req.user,
        searchTerm,
        results
      });
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send('Error connecting to Citizen backend API');
    }
  });

  app.get('/clear', async (req, reply) => {
    req.session.searchTerm = undefined;
    return reply.redirect('/');
  });
}