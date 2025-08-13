import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type UpdateDeviceInput, type CreateDeviceInput } from '../schema';
import { updateDevice } from '../handlers/update_device';
import { eq } from 'drizzle-orm';

// Helper function to create a test device
const createTestDevice = async (deviceData: Partial<CreateDeviceInput> = {}) => {
  const defaultDevice: CreateDeviceInput = {
    name: 'Test Device',
    type: 'physical_server',
    ip_address: '192.168.1.100',
    make: 'Dell',
    model: 'PowerEdge R740',
    operating_system: 'Ubuntu 22.04',
    cpu: 'Intel Xeon Silver 4214',
    ram: 32,
    storage_capacity: 1024,
    status: 'offline',
    notes: 'Test device for updates'
  };

  const mergedDevice = { ...defaultDevice, ...deviceData };

  const result = await db.insert(devicesTable)
    .values({
      name: mergedDevice.name,
      type: mergedDevice.type,
      ip_address: mergedDevice.ip_address,
      make: mergedDevice.make,
      model: mergedDevice.model,
      operating_system: mergedDevice.operating_system,
      cpu: mergedDevice.cpu,
      ram: mergedDevice.ram,
      storage_capacity: mergedDevice.storage_capacity,
      status: mergedDevice.status,
      notes: mergedDevice.notes
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateDevice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a device successfully', async () => {
    // Create a test device
    const device = await createTestDevice();

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      name: 'Updated Device Name',
      type: 'virtual_machine',
      ip_address: '10.0.0.50',
      status: 'online'
    };

    const result = await updateDevice(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(device.id);
    expect(result!.name).toEqual('Updated Device Name');
    expect(result!.type).toEqual('virtual_machine');
    expect(result!.ip_address).toEqual('10.0.0.50');
    expect(result!.status).toEqual('online');
    
    // Verify unchanged fields remain the same
    expect(result!.make).toEqual('Dell');
    expect(result!.model).toEqual('PowerEdge R740');
    expect(result!.ram).toEqual(32);
    expect(result!.storage_capacity).toEqual(1024);
    
    // Verify updated_at is more recent
    expect(result!.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
  });

  it('should update device in database', async () => {
    // Create a test device
    const device = await createTestDevice();

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      name: 'Database Updated Device',
      ram: 64,
      storage_capacity: 2048
    };

    await updateDevice(updateInput);

    // Query database directly to verify update
    const updatedDevices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, device.id))
      .execute();

    expect(updatedDevices).toHaveLength(1);
    const updatedDevice = updatedDevices[0];
    
    expect(updatedDevice.name).toEqual('Database Updated Device');
    expect(Number(updatedDevice.ram)).toEqual(64);
    expect(Number(updatedDevice.storage_capacity)).toEqual(2048);
    expect(updatedDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    
    // Verify unchanged fields
    expect(updatedDevice.type).toEqual('physical_server');
    expect(updatedDevice.ip_address).toEqual('192.168.1.100');
  });

  it('should handle nullable fields correctly', async () => {
    // Create device with some null values
    const device = await createTestDevice({
      ip_address: null,
      make: null,
      model: null,
      operating_system: null,
      cpu: null,
      ram: null,
      storage_capacity: null,
      notes: null
    });

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      ip_address: '192.168.100.50',
      make: 'HP',
      ram: 16,
      notes: 'Updated with new values'
    };

    const result = await updateDevice(updateInput);

    expect(result).not.toBeNull();
    expect(result!.ip_address).toEqual('192.168.100.50');
    expect(result!.make).toEqual('HP');
    expect(result!.ram).toEqual(16);
    expect(result!.notes).toEqual('Updated with new values');
    
    // Verify other nullable fields remain null
    expect(result!.model).toBeNull();
    expect(result!.operating_system).toBeNull();
    expect(result!.cpu).toBeNull();
    expect(result!.storage_capacity).toBeNull();
  });

  it('should set nullable fields to null', async () => {
    // Create device with non-null values
    const device = await createTestDevice();

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      ip_address: null,
      make: null,
      ram: null,
      notes: null
    };

    const result = await updateDevice(updateInput);

    expect(result).not.toBeNull();
    expect(result!.ip_address).toBeNull();
    expect(result!.make).toBeNull();
    expect(result!.ram).toBeNull();
    expect(result!.notes).toBeNull();
    
    // Verify other fields remain unchanged
    expect(result!.name).toEqual('Test Device');
    expect(result!.type).toEqual('physical_server');
    expect(result!.model).toEqual('PowerEdge R740');
  });

  it('should return null for non-existent device', async () => {
    const updateInput: UpdateDeviceInput = {
      id: 99999,
      name: 'Non-existent Device'
    };

    const result = await updateDevice(updateInput);

    expect(result).toBeNull();
  });

  it('should return null when no fields are provided for update', async () => {
    const device = await createTestDevice();

    const updateInput: UpdateDeviceInput = {
      id: device.id
      // No other fields provided
    };

    const result = await updateDevice(updateInput);

    expect(result).toBeNull();
  });

  it('should update only specified fields', async () => {
    const device = await createTestDevice();
    const originalUpdatedAt = device.updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      status: 'maintenance'
    };

    const result = await updateDevice(updateInput);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('maintenance');
    
    // Verify all other fields remain unchanged
    expect(result!.name).toEqual(device.name);
    expect(result!.type).toEqual(device.type);
    expect(result!.ip_address).toEqual(device.ip_address);
    expect(result!.make).toEqual(device.make);
    expect(result!.model).toEqual(device.model);
    expect(result!.ram).toEqual(32);
    expect(result!.storage_capacity).toEqual(1024);
    
    // Verify updated_at was changed
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle numeric type conversions correctly', async () => {
    const device = await createTestDevice();

    const updateInput: UpdateDeviceInput = {
      id: device.id,
      ram: 128.5, // Test decimal values
      storage_capacity: 2048.25
    };

    const result = await updateDevice(updateInput);

    expect(result).not.toBeNull();
    expect(typeof result!.ram).toBe('number');
    expect(typeof result!.storage_capacity).toBe('number');
    expect(result!.ram).toEqual(128.5);
    expect(result!.storage_capacity).toEqual(2048.25);
  });

  it('should update device with all device types', async () => {
    const deviceTypes = ['physical_server', 'virtual_machine', 'router', 'switch', 'access_point', 'storage'] as const;
    
    for (const deviceType of deviceTypes) {
      const device = await createTestDevice({ type: 'physical_server' });
      
      const updateInput: UpdateDeviceInput = {
        id: device.id,
        type: deviceType
      };

      const result = await updateDevice(updateInput);

      expect(result).not.toBeNull();
      expect(result!.type).toEqual(deviceType);
    }
  });

  it('should update device with all status types', async () => {
    const statusTypes = ['online', 'offline', 'maintenance', 'error'] as const;
    
    for (const status of statusTypes) {
      const device = await createTestDevice({ status: 'offline' });
      
      const updateInput: UpdateDeviceInput = {
        id: device.id,
        status: status
      };

      const result = await updateDevice(updateInput);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
    }
  });
});