import { db } from '../db';
import { deviceRelationshipsTable } from '../db/schema';
import { type GetDeviceRelationshipsInput, type DeviceRelationship } from '../schema';
import { eq, or, and, type SQL } from 'drizzle-orm';

export const getDeviceRelationships = async (input: GetDeviceRelationshipsInput): Promise<DeviceRelationship[]> => {
  try {
    // Build conditions array for optional filters
    const conditions: SQL<unknown>[] = [];

    // Filter by device_id (can be either parent or child)
    if (input.device_id !== undefined) {
      conditions.push(
        or(
          eq(deviceRelationshipsTable.parent_device_id, input.device_id),
          eq(deviceRelationshipsTable.child_device_id, input.device_id)
        )!
      );
    }

    // Filter by relationship_type
    if (input.relationship_type !== undefined) {
      conditions.push(eq(deviceRelationshipsTable.relationship_type, input.relationship_type));
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(deviceRelationshipsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(deviceRelationshipsTable)
          .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Device relationships query failed:', error);
    throw error;
  }
};