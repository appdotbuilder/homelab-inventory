import { db } from '../db';
import { deviceRelationshipsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteDeviceRelationshipInput } from '../schema';

export async function deleteDeviceRelationship(input: DeleteDeviceRelationshipInput): Promise<{ success: boolean }> {
  try {
    // Delete the device relationship with the specified id
    const result = await db.delete(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, input.id))
      .execute();

    // Check if any rows were affected (deleted)
    const success = result.rowCount !== null && result.rowCount > 0;

    return { success };
  } catch (error) {
    console.error('Device relationship deletion failed:', error);
    throw error;
  }
}