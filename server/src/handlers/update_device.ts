import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type UpdateDeviceInput, type Device } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDevice = async (input: UpdateDeviceInput): Promise<Device | null> => {
  try {
    const { id, ...updates } = input;

    // Build the update object, only including fields that are provided
    const updateData: Record<string, any> = {};
    
    if (updates.name !== undefined) {
      updateData['name'] = updates.name;
    }
    if (updates.type !== undefined) {
      updateData['type'] = updates.type;
    }
    if (updates.ip_address !== undefined) {
      updateData['ip_address'] = updates.ip_address;
    }
    if (updates.make !== undefined) {
      updateData['make'] = updates.make;
    }
    if (updates.model !== undefined) {
      updateData['model'] = updates.model;
    }
    if (updates.operating_system !== undefined) {
      updateData['operating_system'] = updates.operating_system;
    }
    if (updates.cpu !== undefined) {
      updateData['cpu'] = updates.cpu;
    }
    if (updates.ram !== undefined) {
      updateData['ram'] = updates.ram;
    }
    if (updates.storage_capacity !== undefined) {
      updateData['storage_capacity'] = updates.storage_capacity;
    }
    if (updates.status !== undefined) {
      updateData['status'] = updates.status;
    }
    if (updates.notes !== undefined) {
      updateData['notes'] = updates.notes;
    }

    // Always update the updated_at timestamp
    updateData['updated_at'] = new Date();

    // If no fields to update (besides id), return null
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return null;
    }

    // Perform the update
    const result = await db.update(devicesTable)
      .set(updateData)
      .where(eq(devicesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null; // Device not found
    }

    // Convert real fields back to numbers for the return type
    const device = result[0];
    return {
      ...device,
      ram: device.ram !== null ? Number(device.ram) : null,
      storage_capacity: device.storage_capacity !== null ? Number(device.storage_capacity) : null
    };
  } catch (error) {
    console.error('Device update failed:', error);
    throw error;
  }
};