import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import { 
  createDeviceInputSchema,
  updateDeviceInputSchema,
  getDeviceByIdInputSchema,
  deleteDeviceInputSchema,
  getDevicesByTypeInputSchema,
  createDeviceRelationshipInputSchema,
  updateDeviceRelationshipInputSchema,
  deleteDeviceRelationshipInputSchema,
  getDeviceRelationshipsInputSchema
} from './schema';

// Import handlers
import { createDevice } from './handlers/create_device';
import { getDevices } from './handlers/get_devices';
import { getDeviceById } from './handlers/get_device_by_id';
import { getDevicesByType } from './handlers/get_devices_by_type';
import { updateDevice } from './handlers/update_device';
import { deleteDevice } from './handlers/delete_device';
import { createDeviceRelationship } from './handlers/create_device_relationship';
import { getAllDeviceRelationships } from './handlers/get_all_device_relationships';
import { getDeviceRelationships } from './handlers/get_device_relationships';
import { updateDeviceRelationship } from './handlers/update_device_relationship';
import { deleteDeviceRelationship } from './handlers/delete_device_relationship';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Device management routes
  createDevice: publicProcedure
    .input(createDeviceInputSchema)
    .mutation(({ input }) => createDevice(input)),

  getDevices: publicProcedure
    .query(() => getDevices()),

  getDeviceById: publicProcedure
    .input(getDeviceByIdInputSchema)
    .query(({ input }) => getDeviceById(input)),

  getDevicesByType: publicProcedure
    .input(getDevicesByTypeInputSchema)
    .query(({ input }) => getDevicesByType(input)),

  updateDevice: publicProcedure
    .input(updateDeviceInputSchema)
    .mutation(({ input }) => updateDevice(input)),

  deleteDevice: publicProcedure
    .input(deleteDeviceInputSchema)
    .mutation(({ input }) => deleteDevice(input)),

  // Device relationship management routes
  createDeviceRelationship: publicProcedure
    .input(createDeviceRelationshipInputSchema)
    .mutation(({ input }) => createDeviceRelationship(input)),

  getAllDeviceRelationships: publicProcedure
    .query(() => getAllDeviceRelationships()),

  getDeviceRelationships: publicProcedure
    .input(getDeviceRelationshipsInputSchema)
    .query(({ input }) => getDeviceRelationships(input)),

  updateDeviceRelationship: publicProcedure
    .input(updateDeviceRelationshipInputSchema)
    .mutation(({ input }) => updateDeviceRelationship(input)),

  deleteDeviceRelationship: publicProcedure
    .input(deleteDeviceRelationshipInputSchema)
    .mutation(({ input }) => deleteDeviceRelationship(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Home Lab Inventory TRPC server listening at port: ${port}`);
}

start();