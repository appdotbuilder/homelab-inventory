import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type GetDeviceByIdInput, type Device } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDeviceById(input: GetDeviceByIdInput): Promise<Device | null> {
  try {
    // Query device by ID
    const results = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const device = results[0];

    // Convert numeric fields from database (real columns return as numbers in this case)
    return {
      ...device,
      ram: device.ram, // real columns already return as numbers
      storage_capacity: device.storage_capacity // real columns already return as numbers
    };
  } catch (error) {
    console.error('Device retrieval failed:', error);
    throw error;
  }
}