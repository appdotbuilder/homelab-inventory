import { db } from '../db';
import { deviceRelationshipsTable } from '../db/schema';
import { type DeviceRelationship } from '../schema';

export const getAllDeviceRelationships = async (): Promise<DeviceRelationship[]> => {
  try {
    const results = await db.select()
      .from(deviceRelationshipsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get all device relationships:', error);
    throw error;
  }
};