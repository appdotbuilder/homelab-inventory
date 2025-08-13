import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type CreateDeviceInput } from '../schema';
import { createDevice } from '../handlers/create_device';
import { eq } from 'drizzle-orm';

// Test input with all fields
const fullTestInput: CreateDeviceInput = {
  name: 'Test Server',
  type: 'physical_server',
  ip_address: '192.168.1.100',
  make: 'Dell',
  model: 'PowerEdge R730',
  operating_system: 'Ubuntu 22.04',
  cpu: 'Intel Xeon E5-2670',
  ram: 32,
  storage_capacity: 1000,
  status: 'online',
  notes: 'Production web server'
};

// Minimal test input with required fields only
const minimalTestInput: CreateDeviceInput = {
  name: 'Minimal Device',
  type: 'virtual_machine',
  status: 'offline'
};

describe('createDevice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a device with all fields', async () => {
    const result = await createDevice(fullTestInput);

    // Verify all field values
    expect(result.name).toEqual('Test Server');
    expect(result.type).toEqual('physical_server');
    expect(result.ip_address).toEqual('192.168.1.100');
    expect(result.make).toEqual('Dell');
    expect(result.model).toEqual('PowerEdge R730');
    expect(result.operating_system).toEqual('Ubuntu 22.04');
    expect(result.cpu).toEqual('Intel Xeon E5-2670');
    expect(result.ram).toEqual(32);
    expect(result.storage_capacity).toEqual(1000);
    expect(result.status).toEqual('online');
    expect(result.notes).toEqual('Production web server');

    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a device with minimal fields', async () => {
    const result = await createDevice(minimalTestInput);

    // Verify required fields
    expect(result.name).toEqual('Minimal Device');
    expect(result.type).toEqual('virtual_machine');
    expect(result.status).toEqual('offline');

    // Verify nullable fields are null
    expect(result.ip_address).toBeNull();
    expect(result.make).toBeNull();
    expect(result.model).toBeNull();
    expect(result.operating_system).toBeNull();
    expect(result.cpu).toBeNull();
    expect(result.ram).toBeNull();
    expect(result.storage_capacity).toBeNull();
    expect(result.notes).toBeNull();

    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save device to database', async () => {
    const result = await createDevice(fullTestInput);

    // Query the database to verify the device was saved
    const devices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, result.id))
      .execute();

    expect(devices).toHaveLength(1);
    const savedDevice = devices[0];

    expect(savedDevice.name).toEqual('Test Server');
    expect(savedDevice.type).toEqual('physical_server');
    expect(savedDevice.ip_address).toEqual('192.168.1.100');
    expect(savedDevice.make).toEqual('Dell');
    expect(savedDevice.model).toEqual('PowerEdge R730');
    expect(savedDevice.operating_system).toEqual('Ubuntu 22.04');
    expect(savedDevice.cpu).toEqual('Intel Xeon E5-2670');
    expect(savedDevice.ram).toEqual(32);
    expect(savedDevice.storage_capacity).toEqual(1000);
    expect(savedDevice.status).toEqual('online');
    expect(savedDevice.notes).toEqual('Production web server');
    expect(savedDevice.created_at).toBeInstanceOf(Date);
    expect(savedDevice.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null IP address correctly', async () => {
    const inputWithNullIP: CreateDeviceInput = {
      name: 'Router Device',
      type: 'router',
      ip_address: null,
      status: 'online'
    };

    const result = await createDevice(inputWithNullIP);

    expect(result.name).toEqual('Router Device');
    expect(result.type).toEqual('router');
    expect(result.ip_address).toBeNull();
    expect(result.status).toEqual('online');
  });

  it('should use provided status correctly', async () => {
    const inputWithStatus: CreateDeviceInput = {
      name: 'Switch Device',
      type: 'switch',
      status: 'maintenance'
    };

    const result = await createDevice(inputWithStatus);

    expect(result.name).toEqual('Switch Device');
    expect(result.type).toEqual('switch');
    expect(result.status).toEqual('maintenance');
  });

  it('should handle all device types', async () => {
    const deviceTypes: CreateDeviceInput['type'][] = [
      'physical_server',
      'virtual_machine',
      'router',
      'switch',
      'access_point',
      'storage'
    ];

    for (const type of deviceTypes) {
      const input: CreateDeviceInput = {
        name: `Test ${type}`,
        type: type,
        status: 'online'
      };

      const result = await createDevice(input);
      expect(result.type).toEqual(type);
      expect(result.name).toEqual(`Test ${type}`);
    }
  });

  it('should handle all device statuses', async () => {
    const deviceStatuses: CreateDeviceInput['status'][] = [
      'online',
      'offline',
      'maintenance',
      'error'
    ];

    for (const status of deviceStatuses) {
      const input: CreateDeviceInput = {
        name: `Device ${status}`,
        type: 'virtual_machine',
        status: status
      };

      const result = await createDevice(input);
      expect(result.status).toEqual(status);
      expect(result.name).toEqual(`Device ${status}`);
    }
  });

  it('should handle numeric fields correctly', async () => {
    const inputWithNumbers: CreateDeviceInput = {
      name: 'Numeric Test',
      type: 'physical_server',
      ram: 64.5, // Float value
      storage_capacity: 2000.25, // Float value
      status: 'online'
    };

    const result = await createDevice(inputWithNumbers);

    expect(result.ram).toEqual(64.5);
    expect(result.storage_capacity).toEqual(2000.25);
    expect(typeof result.ram).toEqual('number');
    expect(typeof result.storage_capacity).toEqual('number');

    // Verify in database
    const devices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, result.id))
      .execute();

    expect(devices[0].ram).toEqual(64.5);
    expect(devices[0].storage_capacity).toEqual(2000.25);
  });
});