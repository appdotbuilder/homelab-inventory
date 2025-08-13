import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type Device } from '../schema';

export async function getDevices(): Promise<Device[]> {
  try {
    // Fetch all devices from the database
    const results = await db.select()
      .from(devicesTable)
      .execute();

    // Return results directly - ram and storage_capacity are already numbers from real() columns
    return results;
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    throw error;
  }
}