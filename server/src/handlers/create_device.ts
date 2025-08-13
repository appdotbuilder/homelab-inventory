import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type CreateDeviceInput, type Device } from '../schema';

export const createDevice = async (input: CreateDeviceInput): Promise<Device> => {
  try {
    // Insert device record
    const result = await db.insert(devicesTable)
      .values({
        name: input.name,
        type: input.type,
        ip_address: input.ip_address || null,
        make: input.make || null,
        model: input.model || null,
        operating_system: input.operating_system || null,
        cpu: input.cpu || null,
        ram: input.ram || null, // real columns don't need conversion
        storage_capacity: input.storage_capacity || null, // real columns don't need conversion
        status: input.status,
        notes: input.notes || null
      })
      .returning()
      .execute();

    // Return the created device (no numeric conversion needed for real columns)
    const device = result[0];
    return device;
  } catch (error) {
    console.error('Device creation failed:', error);
    throw error;
  }
};