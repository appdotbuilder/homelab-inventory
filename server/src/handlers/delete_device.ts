import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type DeleteDeviceInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteDevice(input: DeleteDeviceInput): Promise<{ success: boolean }> {
  try {
    // Delete the device record
    const result = await db.delete(devicesTable)
      .where(eq(devicesTable.id, input.id))
      .returning()
      .execute();

    // Return true if a device was actually deleted, false if no device was found
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Device deletion failed:', error);
    throw error;
  }
}