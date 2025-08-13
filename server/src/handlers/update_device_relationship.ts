import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type UpdateDeviceRelationshipInput, type DeviceRelationship } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateDeviceRelationship(input: UpdateDeviceRelationshipInput): Promise<DeviceRelationship | null> {
  try {
    // Check if the relationship exists
    const existingRelationship = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, input.id))
      .execute();

    if (existingRelationship.length === 0) {
      return null;
    }

    // Validate that parent and child devices exist if they are being updated
    if (input.parent_device_id !== undefined) {
      const parentDevice = await db.select()
        .from(devicesTable)
        .where(eq(devicesTable.id, input.parent_device_id))
        .execute();

      if (parentDevice.length === 0) {
        throw new Error(`Parent device with ID ${input.parent_device_id} does not exist`);
      }
    }

    if (input.child_device_id !== undefined) {
      const childDevice = await db.select()
        .from(devicesTable)
        .where(eq(devicesTable.id, input.child_device_id))
        .execute();

      if (childDevice.length === 0) {
        throw new Error(`Child device with ID ${input.child_device_id} does not exist`);
      }
    }

    // Prevent self-relationship (if both parent and child are being updated)
    const finalParentId = input.parent_device_id ?? existingRelationship[0].parent_device_id;
    const finalChildId = input.child_device_id ?? existingRelationship[0].child_device_id;

    if (finalParentId === finalChildId) {
      throw new Error('A device cannot have a relationship with itself');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof deviceRelationshipsTable.$inferInsert> = {};
    
    if (input.parent_device_id !== undefined) {
      updateData.parent_device_id = input.parent_device_id;
    }
    
    if (input.child_device_id !== undefined) {
      updateData.child_device_id = input.child_device_id;
    }
    
    if (input.relationship_type !== undefined) {
      updateData.relationship_type = input.relationship_type;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // If no fields to update, return the existing relationship
    if (Object.keys(updateData).length === 0) {
      return existingRelationship[0];
    }

    // Update the relationship
    const result = await db.update(deviceRelationshipsTable)
      .set(updateData)
      .where(eq(deviceRelationshipsTable.id, input.id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Device relationship update failed:', error);
    throw error;
  }
}