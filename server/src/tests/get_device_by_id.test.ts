import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type GetDeviceByIdInput, type CreateDeviceInput } from '../schema';
import { getDeviceById } from '../handlers/get_device_by_id';
import { eq } from 'drizzle-orm';

// Test device input
const testDeviceInput: CreateDeviceInput = {
  name: 'Test Server',
  type: 'physical_server',
  ip_address: '192.168.1.100',
  make: 'Dell',
  model: 'PowerEdge R740',
  operating_system: 'Ubuntu 20.04',
  cpu: 'Intel Xeon Silver 4214',
  ram: 32,
  storage_capacity: 1000,
  status: 'online',
  notes: 'Main production server'
};

// Minimal test device input
const minimalDeviceInput: CreateDeviceInput = {
  name: 'Minimal Device',
  type: 'router',
  status: 'offline'
};

describe('getDeviceById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return device when found', async () => {
    // Create a test device first
    const insertResult = await db.insert(devicesTable)
      .values({
        name: testDeviceInput.name,
        type: testDeviceInput.type,
        ip_address: testDeviceInput.ip_address,
        make: testDeviceInput.make,
        model: testDeviceInput.model,
        operating_system: testDeviceInput.operating_system,
        cpu: testDeviceInput.cpu,
        ram: testDeviceInput.ram,
        storage_capacity: testDeviceInput.storage_capacity,
        status: testDeviceInput.status,
        notes: testDeviceInput.notes
      })
      .returning()
      .execute();

    const createdDevice = insertResult[0];
    const input: GetDeviceByIdInput = { id: createdDevice.id };

    // Test the handler
    const result = await getDeviceById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdDevice.id);
    expect(result!.name).toBe('Test Server');
    expect(result!.type).toBe('physical_server');
    expect(result!.ip_address).toBe('192.168.1.100');
    expect(result!.make).toBe('Dell');
    expect(result!.model).toBe('PowerEdge R740');
    expect(result!.operating_system).toBe('Ubuntu 20.04');
    expect(result!.cpu).toBe('Intel Xeon Silver 4214');
    expect(result!.ram).toBe(32);
    expect(result!.storage_capacity).toBe(1000);
    expect(result!.status).toBe('online');
    expect(result!.notes).toBe('Main production server');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify numeric fields are properly typed
    expect(typeof result!.ram).toBe('number');
    expect(typeof result!.storage_capacity).toBe('number');
  });

  it('should return device with null fields when found', async () => {
    // Create a minimal test device
    const insertResult = await db.insert(devicesTable)
      .values({
        name: minimalDeviceInput.name,
        type: minimalDeviceInput.type,
        status: minimalDeviceInput.status
      })
      .returning()
      .execute();

    const createdDevice = insertResult[0];
    const input: GetDeviceByIdInput = { id: createdDevice.id };

    // Test the handler
    const result = await getDeviceById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdDevice.id);
    expect(result!.name).toBe('Minimal Device');
    expect(result!.type).toBe('router');
    expect(result!.status).toBe('offline');
    
    // Verify nullable fields are null
    expect(result!.ip_address).toBeNull();
    expect(result!.make).toBeNull();
    expect(result!.model).toBeNull();
    expect(result!.operating_system).toBeNull();
    expect(result!.cpu).toBeNull();
    expect(result!.ram).toBeNull();
    expect(result!.storage_capacity).toBeNull();
    expect(result!.notes).toBeNull();
    
    // Verify required fields are present
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when device not found', async () => {
    const input: GetDeviceByIdInput = { id: 99999 };

    const result = await getDeviceById(input);

    expect(result).toBeNull();
  });

  it('should verify device exists in database', async () => {
    // Create a test device
    const insertResult = await db.insert(devicesTable)
      .values({
        name: testDeviceInput.name,
        type: testDeviceInput.type,
        ip_address: testDeviceInput.ip_address,
        make: testDeviceInput.make,
        model: testDeviceInput.model,
        operating_system: testDeviceInput.operating_system,
        cpu: testDeviceInput.cpu,
        ram: testDeviceInput.ram,
        storage_capacity: testDeviceInput.storage_capacity,
        status: testDeviceInput.status,
        notes: testDeviceInput.notes
      })
      .returning()
      .execute();

    const createdDevice = insertResult[0];
    const input: GetDeviceByIdInput = { id: createdDevice.id };

    // Get device using handler
    const handlerResult = await getDeviceById(input);

    // Verify the device exists directly in database
    const dbResults = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, createdDevice.id))
      .execute();

    expect(dbResults).toHaveLength(1);
    expect(handlerResult).not.toBeNull();
    expect(handlerResult!.id).toBe(dbResults[0].id);
    expect(handlerResult!.name).toBe(dbResults[0].name);
  });

  it('should handle different device types correctly', async () => {
    const deviceTypes = ['physical_server', 'virtual_machine', 'router', 'switch', 'access_point', 'storage'] as const;
    
    for (const deviceType of deviceTypes) {
      // Create device of each type
      const insertResult = await db.insert(devicesTable)
        .values({
          name: `Test ${deviceType}`,
          type: deviceType,
          status: 'online'
        })
        .returning()
        .execute();

      const createdDevice = insertResult[0];
      const input: GetDeviceByIdInput = { id: createdDevice.id };

      // Test the handler
      const result = await getDeviceById(input);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(deviceType);
      expect(result!.name).toBe(`Test ${deviceType}`);
    }
  });

  it('should handle different device statuses correctly', async () => {
    const deviceStatuses = ['online', 'offline', 'maintenance', 'error'] as const;
    
    for (const status of deviceStatuses) {
      // Create device with each status
      const insertResult = await db.insert(devicesTable)
        .values({
          name: `Test Device ${status}`,
          type: 'physical_server',
          status: status
        })
        .returning()
        .execute();

      const createdDevice = insertResult[0];
      const input: GetDeviceByIdInput = { id: createdDevice.id };

      // Test the handler
      const result = await getDeviceById(input);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
      expect(result!.name).toBe(`Test Device ${status}`);
    }
  });
});