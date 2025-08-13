import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type CreateDeviceRelationshipInput, type DeviceRelationship } from '../schema';
import { eq } from 'drizzle-orm';

export const createDeviceRelationship = async (input: CreateDeviceRelationshipInput): Promise<DeviceRelationship> => {
  try {
    // Validate that both parent and child devices exist
    const [parentDevice, childDevice] = await Promise.all([
      db.select()
        .from(devicesTable)
        .where(eq(devicesTable.id, input.parent_device_id))
        .execute(),
      db.select()
        .from(devicesTable)
        .where(eq(devicesTable.id, input.child_device_id))
        .execute()
    ]);

    if (parentDevice.length === 0) {
      throw new Error(`Parent device with ID ${input.parent_device_id} does not exist`);
    }

    if (childDevice.length === 0) {
      throw new Error(`Child device with ID ${input.child_device_id} does not exist`);
    }

    // Insert the device relationship
    const result = await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: input.parent_device_id,
        child_device_id: input.child_device_id,
        relationship_type: input.relationship_type,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Device relationship creation failed:', error);
    throw error;
  }
};