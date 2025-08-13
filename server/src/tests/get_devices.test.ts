import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type CreateDeviceInput } from '../schema';
import { getDevices } from '../handlers/get_devices';

// Test device inputs
const testDevice1: CreateDeviceInput = {
  name: 'Web Server 01',
  type: 'physical_server',
  ip_address: '192.168.1.10',
  make: 'Dell',
  model: 'PowerEdge R740',
  operating_system: 'Ubuntu 20.04',
  cpu: 'Intel Xeon Silver 4214',
  ram: 32,
  storage_capacity: 1000,
  status: 'online',
  notes: 'Primary web server'
};

const testDevice2: CreateDeviceInput = {
  name: 'Core Router',
  type: 'router',
  ip_address: '10.0.0.1',
  make: 'Cisco',
  model: 'ISR 4331',
  operating_system: 'IOS XE',
  cpu: null,
  ram: null,
  storage_capacity: null,
  status: 'offline',
  notes: null
};

const testDevice3: CreateDeviceInput = {
  name: 'VM Host 01',
  type: 'virtual_machine',
  ip_address: null,
  make: null,
  model: null,
  operating_system: 'CentOS 8',
  cpu: 'Virtual CPU',
  ram: 16,
  storage_capacity: 500,
  status: 'maintenance',
  notes: 'Scheduled maintenance'
};

describe('getDevices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no devices exist', async () => {
    const result = await getDevices();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all devices when they exist', async () => {
    // Insert test devices one by one
    await db.insert(devicesTable).values({
      name: testDevice1.name,
      type: testDevice1.type,
      ip_address: testDevice1.ip_address,
      make: testDevice1.make,
      model: testDevice1.model,
      operating_system: testDevice1.operating_system,
      cpu: testDevice1.cpu,
      ram: testDevice1.ram,
      storage_capacity: testDevice1.storage_capacity,
      status: testDevice1.status,
      notes: testDevice1.notes
    }).execute();

    await db.insert(devicesTable).values({
      name: testDevice2.name,
      type: testDevice2.type,
      ip_address: testDevice2.ip_address,
      make: testDevice2.make,
      model: testDevice2.model,
      operating_system: testDevice2.operating_system,
      cpu: testDevice2.cpu,
      ram: testDevice2.ram,
      storage_capacity: testDevice2.storage_capacity,
      status: testDevice2.status,
      notes: testDevice2.notes
    }).execute();

    await db.insert(devicesTable).values({
      name: testDevice3.name,
      type: testDevice3.type,
      ip_address: testDevice3.ip_address,
      make: testDevice3.make,
      model: testDevice3.model,
      operating_system: testDevice3.operating_system,
      cpu: testDevice3.cpu,
      ram: testDevice3.ram,
      storage_capacity: testDevice3.storage_capacity,
      status: testDevice3.status,
      notes: testDevice3.notes
    }).execute();

    const result = await getDevices();

    expect(result).toHaveLength(3);
    expect(Array.isArray(result)).toBe(true);

    // Verify all devices are returned
    const deviceNames = result.map(d => d.name).sort();
    expect(deviceNames).toEqual(['Core Router', 'VM Host 01', 'Web Server 01']);
  });

  it('should return devices with correct field types and values', async () => {
    // Insert a device with all fields populated
    await db.insert(devicesTable).values({
      name: testDevice1.name,
      type: testDevice1.type,
      ip_address: testDevice1.ip_address,
      make: testDevice1.make,
      model: testDevice1.model,
      operating_system: testDevice1.operating_system,
      cpu: testDevice1.cpu,
      ram: testDevice1.ram,
      storage_capacity: testDevice1.storage_capacity,
      status: testDevice1.status,
      notes: testDevice1.notes
    }).execute();

    const result = await getDevices();

    expect(result).toHaveLength(1);
    const device = result[0];

    // Verify field values
    expect(device.name).toEqual('Web Server 01');
    expect(device.type).toEqual('physical_server');
    expect(device.ip_address).toEqual('192.168.1.10');
    expect(device.make).toEqual('Dell');
    expect(device.model).toEqual('PowerEdge R740');
    expect(device.operating_system).toEqual('Ubuntu 20.04');
    expect(device.cpu).toEqual('Intel Xeon Silver 4214');
    expect(device.status).toEqual('online');
    expect(device.notes).toEqual('Primary web server');

    // Verify numeric fields are numbers
    expect(device.ram).toEqual(32);
    expect(typeof device.ram).toBe('number');
    expect(device.storage_capacity).toEqual(1000);
    expect(typeof device.storage_capacity).toBe('number');

    // Verify auto-generated fields
    expect(device.id).toBeDefined();
    expect(typeof device.id).toBe('number');
    expect(device.created_at).toBeInstanceOf(Date);
    expect(device.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null values correctly', async () => {
    // Insert device with null values
    await db.insert(devicesTable).values({
      name: testDevice2.name,
      type: testDevice2.type,
      ip_address: testDevice2.ip_address,
      make: testDevice2.make,
      model: testDevice2.model,
      operating_system: testDevice2.operating_system,
      cpu: testDevice2.cpu,
      ram: testDevice2.ram,
      storage_capacity: testDevice2.storage_capacity,
      status: testDevice2.status,
      notes: testDevice2.notes
    }).execute();

    const result = await getDevices();

    expect(result).toHaveLength(1);
    const device = result[0];

    // Verify null values are preserved
    expect(device.ip_address).toEqual('10.0.0.1');
    expect(device.make).toEqual('Cisco');
    expect(device.model).toEqual('ISR 4331');
    expect(device.operating_system).toEqual('IOS XE');
    expect(device.cpu).toBeNull();
    expect(device.ram).toBeNull();
    expect(device.storage_capacity).toBeNull();
    expect(device.notes).toBeNull();
  });

  it('should return devices in order of insertion', async () => {
    // Insert devices in specific order
    await db.insert(devicesTable).values({
      name: 'First Device',
      type: 'physical_server'
    }).execute();

    await db.insert(devicesTable).values({
      name: 'Second Device',
      type: 'virtual_machine'
    }).execute();

    await db.insert(devicesTable).values({
      name: 'Third Device',
      type: 'router'
    }).execute();

    const result = await getDevices();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First Device');
    expect(result[1].name).toEqual('Second Device');
    expect(result[2].name).toEqual('Third Device');

    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle mixed device types correctly', async () => {
    // Insert devices of different types
    const deviceTypes = ['physical_server', 'virtual_machine', 'router', 'switch', 'access_point', 'storage'] as const;
    
    for (let i = 0; i < deviceTypes.length; i++) {
      await db.insert(devicesTable).values({
        name: `Device ${i + 1}`,
        type: deviceTypes[i]
      }).execute();
    }

    const result = await getDevices();

    expect(result).toHaveLength(6);

    // Verify all device types are present
    const types = result.map(d => d.type).sort();
    expect(types).toEqual(['access_point', 'physical_server', 'router', 'storage', 'switch', 'virtual_machine']);

    // Verify each device has correct type
    result.forEach(device => {
      expect(deviceTypes).toContain(device.type);
    });
  });
});