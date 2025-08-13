import { z } from 'zod';

// Device type enum
export const deviceTypeEnum = z.enum(['physical_server', 'virtual_machine', 'router', 'switch', 'access_point', 'storage']);
export type DeviceType = z.infer<typeof deviceTypeEnum>;

// Device status enum
export const deviceStatusEnum = z.enum(['online', 'offline', 'maintenance', 'error']);
export type DeviceStatus = z.infer<typeof deviceStatusEnum>;

// Relationship type enum
export const relationshipTypeEnum = z.enum(['hosted_on', 'connected_to', 'manages', 'stores_on']);
export type RelationshipType = z.infer<typeof relationshipTypeEnum>;

// Device schema
export const deviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: deviceTypeEnum,
  ip_address: z.string().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  operating_system: z.string().nullable(),
  cpu: z.string().nullable(),
  ram: z.number().nullable(), // RAM in GB
  storage_capacity: z.number().nullable(), // Storage in GB
  status: deviceStatusEnum,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Device = z.infer<typeof deviceSchema>;

// Input schema for creating devices
export const createDeviceInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: deviceTypeEnum,
  ip_address: z.string().ip().nullable().optional(), // Optional IP validation
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  operating_system: z.string().nullable().optional(),
  cpu: z.string().nullable().optional(),
  ram: z.number().positive().nullable().optional(),
  storage_capacity: z.number().positive().nullable().optional(),
  status: deviceStatusEnum.default('offline'),
  notes: z.string().nullable().optional()
}).refine((data) => {
  // If IP address is provided, it should be valid
  if (data.ip_address === null || data.ip_address === undefined) {
    return true;
  }
  return data.ip_address.length > 0;
}, {
  message: "IP address cannot be empty string",
  path: ["ip_address"]
});

export type CreateDeviceInput = z.infer<typeof createDeviceInputSchema>;

// Input schema for updating devices
export const updateDeviceInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: deviceTypeEnum.optional(),
  ip_address: z.string().ip().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  operating_system: z.string().nullable().optional(),
  cpu: z.string().nullable().optional(),
  ram: z.number().positive().nullable().optional(),
  storage_capacity: z.number().positive().nullable().optional(),
  status: deviceStatusEnum.optional(),
  notes: z.string().nullable().optional()
});

export type UpdateDeviceInput = z.infer<typeof updateDeviceInputSchema>;

// Device relationship schema
export const deviceRelationshipSchema = z.object({
  id: z.number(),
  parent_device_id: z.number(),
  child_device_id: z.number(),
  relationship_type: relationshipTypeEnum,
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type DeviceRelationship = z.infer<typeof deviceRelationshipSchema>;

// Input schema for creating device relationships
export const createDeviceRelationshipInputSchema = z.object({
  parent_device_id: z.number().int().positive(),
  child_device_id: z.number().int().positive(),
  relationship_type: relationshipTypeEnum,
  description: z.string().nullable().optional()
}).refine((data) => data.parent_device_id !== data.child_device_id, {
  message: "A device cannot have a relationship with itself",
  path: ["child_device_id"]
});

export type CreateDeviceRelationshipInput = z.infer<typeof createDeviceRelationshipInputSchema>;

// Input schema for updating device relationships
export const updateDeviceRelationshipInputSchema = z.object({
  id: z.number(),
  parent_device_id: z.number().int().positive().optional(),
  child_device_id: z.number().int().positive().optional(),
  relationship_type: relationshipTypeEnum.optional(),
  description: z.string().nullable().optional()
});

export type UpdateDeviceRelationshipInput = z.infer<typeof updateDeviceRelationshipInputSchema>;

// Query input schemas
export const getDeviceByIdInputSchema = z.object({
  id: z.number().int().positive()
});

export type GetDeviceByIdInput = z.infer<typeof getDeviceByIdInputSchema>;

export const deleteDeviceInputSchema = z.object({
  id: z.number().int().positive()
});

export type DeleteDeviceInput = z.infer<typeof deleteDeviceInputSchema>;

export const deleteDeviceRelationshipInputSchema = z.object({
  id: z.number().int().positive()
});

export type DeleteDeviceRelationshipInput = z.infer<typeof deleteDeviceRelationshipInputSchema>;

// Filter input schemas
export const getDevicesByTypeInputSchema = z.object({
  type: deviceTypeEnum
});

export type GetDevicesByTypeInput = z.infer<typeof getDevicesByTypeInputSchema>;

export const getDeviceRelationshipsInputSchema = z.object({
  device_id: z.number().int().positive().optional(),
  relationship_type: relationshipTypeEnum.optional()
});

export type GetDeviceRelationshipsInput = z.infer<typeof getDeviceRelationshipsInputSchema>;