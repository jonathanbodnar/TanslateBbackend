import { FastifyInstance } from 'fastify';
import intakeStart from './intake/start';
import intakeComplete from './intake/complete';
import reflectionsCreate from './reflections/create';

export default async function registerRoutes(app: FastifyInstance) {
  await intakeStart(app);
  await intakeComplete(app);
  await reflectionsCreate(app);
}

