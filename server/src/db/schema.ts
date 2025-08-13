import { serial, text, pgTable, timestamp, integer, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const deviceTypeEnum = pgEnum('device_type', [
  'physical_server',
  'virtual_machine', 
  'router',
  'switch',
  'access_point',
  'storage'
]);

export const deviceStatusEnum = pgEnum('device_status', [
  'online',
  'offline', 
  'maintenance',
  'error'
]);

export const relationshipTypeEnum = pgEnum('relationship_type', [
  'hosted_on',
  'connected_to',
  'manages',
  'stores_on'
]);

// Devices table
export const devicesTable = pgTable('devices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: deviceTypeEnum('type').notNull(),
  ip_address: text('ip_address'), // Nullable by default
  make: text('make'), // Nullable by default
  model: text('model'), // Nullable by default
  operating_system: text('operating_system'), // Nullable by default
  cpu: text('cpu'), // Nullable by default
  ram: real('ram'), // RAM in GB, nullable by default
  storage_capacity: real('storage_capacity'), // Storage in GB, nullable by default
  status: deviceStatusEnum('status').notNull().default('offline'),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Device relationships table
export const deviceRelationshipsTable = pgTable('device_relationships', {
  id: serial('id').primaryKey(),
  parent_device_id: integer('parent_device_id').notNull().references(() => devicesTable.id, { onDelete: 'cascade' }),
  child_device_id: integer('child_device_id').notNull().references(() => devicesTable.id, { onDelete: 'cascade' }),
  relationship_type: relationshipTypeEnum('relationship_type').notNull(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const devicesRelations = relations(devicesTable, ({ many }) => ({
  parentRelationships: many(deviceRelationshipsTable, {
    relationName: 'parentDevice'
  }),
  childRelationships: many(deviceRelationshipsTable, {
    relationName: 'childDevice'
  })
}));

export const deviceRelationshipsRelations = relations(deviceRelationshipsTable, ({ one }) => ({
  parentDevice: one(devicesTable, {
    fields: [deviceRelationshipsTable.parent_device_id],
    references: [devicesTable.id],
    relationName: 'parentDevice'
  }),
  childDevice: one(devicesTable, {
    fields: [deviceRelationshipsTable.child_device_id],
    references: [devicesTable.id],
    relationName: 'childDevice'
  })
}));

// TypeScript types for the table schemas
export type Device = typeof devicesTable.$inferSelect; // For SELECT operations
export type NewDevice = typeof devicesTable.$inferInsert; // For INSERT operations

export type DeviceRelationship = typeof deviceRelationshipsTable.$inferSelect; // For SELECT operations
export type NewDeviceRelationship = typeof deviceRelationshipsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  devices: devicesTable,
  deviceRelationships: deviceRelationshipsTable 
};

export const tableRelations = {
  devicesRelations,
  deviceRelationshipsRelations
};