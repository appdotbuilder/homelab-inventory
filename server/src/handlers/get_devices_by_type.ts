import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type GetDevicesByTypeInput, type Device } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDevicesByType(input: GetDevicesByTypeInput): Promise<Device[]> {
  try {
    const results = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.type, input.type))
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(device => ({
      ...device,
      ram: device.ram ? parseFloat(device.ram.toString()) : null,
      storage_capacity: device.storage_capacity ? parseFloat(device.storage_capacity.toString()) : null
    }));
  } catch (error) {
    console.error('Get devices by type failed:', error);
    throw error;
  }
}