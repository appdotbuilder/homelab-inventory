import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type GetDevicesByTypeInput } from '../schema';
import { getDevicesByType } from '../handlers/get_devices_by_type';

describe('getDevicesByType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return devices of specified type', async () => {
    // Create test devices of different types
    await db.insert(devicesTable).values([
      {
        name: 'Web Server 1',
        type: 'physical_server',
        ip_address: '192.168.1.10',
        make: 'Dell',
        model: 'PowerEdge R740',
        operating_system: 'Ubuntu 20.04',
        cpu: 'Intel Xeon Silver 4214',
        ram: 32,
        storage_capacity: 2000,
        status: 'online',
        notes: 'Production web server'
      },
      {
        name: 'DB Server 1',
        type: 'physical_server',
        ip_address: '192.168.1.11',
        make: 'HP',
        model: 'ProLiant DL380',
        operating_system: 'CentOS 8',
        cpu: 'Intel Xeon Gold 6248',
        ram: 64,
        storage_capacity: 4000,
        status: 'online',
        notes: 'Database server'
      },
      {
        name: 'Main Router',
        type: 'router',
        ip_address: '192.168.1.1',
        make: 'Cisco',
        model: 'ISR 4331',
        operating_system: 'IOS XE',
        cpu: null,
        ram: null,
        storage_capacity: null,
        status: 'online',
        notes: 'Main network router'
      }
    ]).execute();

    const input: GetDevicesByTypeInput = {
      type: 'physical_server'
    };

    const result = await getDevicesByType(input);

    expect(result).toHaveLength(2);
    
    // Verify all returned devices are of the correct type
    result.forEach(device => {
      expect(device.type).toEqual('physical_server');
    });

    // Verify specific device data
    const webServer = result.find(d => d.name === 'Web Server 1');
    expect(webServer).toBeDefined();
    expect(webServer!.make).toEqual('Dell');
    expect(webServer!.model).toEqual('PowerEdge R740');
    expect(webServer!.ip_address).toEqual('192.168.1.10');
    expect(webServer!.operating_system).toEqual('Ubuntu 20.04');
    expect(webServer!.status).toEqual('online');
    
    // Verify numeric field conversions
    expect(typeof webServer!.ram).toEqual('number');
    expect(webServer!.ram).toEqual(32);
    expect(typeof webServer!.storage_capacity).toEqual('number');
    expect(webServer!.storage_capacity).toEqual(2000);

    const dbServer = result.find(d => d.name === 'DB Server 1');
    expect(dbServer).toBeDefined();
    expect(dbServer!.make).toEqual('HP');
    expect(dbServer!.ram).toEqual(64);
    expect(dbServer!.storage_capacity).toEqual(4000);
  });

  it('should return empty array when no devices of specified type exist', async () => {
    // Create devices of different types
    await db.insert(devicesTable).values([
      {
        name: 'Main Router',
        type: 'router',
        ip_address: '192.168.1.1',
        status: 'online'
      },
      {
        name: 'Core Switch',
        type: 'switch',
        ip_address: '192.168.1.2',
        status: 'online'
      }
    ]).execute();

    const input: GetDevicesByTypeInput = {
      type: 'physical_server'
    };

    const result = await getDevicesByType(input);

    expect(result).toHaveLength(0);
  });

  it('should handle devices with null numeric values', async () => {
    // Create a device with null numeric fields
    await db.insert(devicesTable).values({
      name: 'Simple Router',
      type: 'router',
      ip_address: '10.0.0.1',
      make: 'Linksys',
      model: 'WRT3200ACM',
      operating_system: 'OpenWrt',
      cpu: 'ARM Cortex-A9',
      ram: null, // Null RAM
      storage_capacity: null, // Null storage
      status: 'online',
      notes: 'Home router'
    }).execute();

    const input: GetDevicesByTypeInput = {
      type: 'router'
    };

    const result = await getDevicesByType(input);

    expect(result).toHaveLength(1);
    
    const router = result[0];
    expect(router.name).toEqual('Simple Router');
    expect(router.type).toEqual('router');
    expect(router.ram).toBeNull();
    expect(router.storage_capacity).toBeNull();
    expect(router.make).toEqual('Linksys');
    expect(router.model).toEqual('WRT3200ACM');
  });

  it('should return all virtual machines when type is virtual_machine', async () => {
    // Create test virtual machines
    await db.insert(devicesTable).values([
      {
        name: 'VM-Web-01',
        type: 'virtual_machine',
        ip_address: '10.0.1.10',
        operating_system: 'Ubuntu 22.04',
        cpu: '4 vCPUs',
        ram: 8,
        storage_capacity: 100,
        status: 'online',
        notes: 'Web application VM'
      },
      {
        name: 'VM-DB-01',
        type: 'virtual_machine',
        ip_address: '10.0.1.11',
        operating_system: 'CentOS 9',
        cpu: '8 vCPUs',
        ram: 16,
        storage_capacity: 500,
        status: 'maintenance',
        notes: 'Database VM under maintenance'
      }
    ]).execute();

    const input: GetDevicesByTypeInput = {
      type: 'virtual_machine'
    };

    const result = await getDevicesByType(input);

    expect(result).toHaveLength(2);
    
    result.forEach(device => {
      expect(device.type).toEqual('virtual_machine');
      expect(device.name).toMatch(/^VM-/);
      expect(typeof device.ram).toEqual('number');
      expect(typeof device.storage_capacity).toEqual('number');
    });

    // Verify specific VMs
    const webVM = result.find(d => d.name === 'VM-Web-01');
    expect(webVM).toBeDefined();
    expect(webVM!.status).toEqual('online');
    expect(webVM!.ram).toEqual(8);

    const dbVM = result.find(d => d.name === 'VM-DB-01');
    expect(dbVM).toBeDefined();
    expect(dbVM!.status).toEqual('maintenance');
    expect(dbVM!.ram).toEqual(16);
    expect(dbVM!.storage_capacity).toEqual(500);
  });

  it('should handle all device types correctly', async () => {
    // Create one device of each type
    await db.insert(devicesTable).values([
      {
        name: 'Physical Server',
        type: 'physical_server',
        status: 'online'
      },
      {
        name: 'Virtual Machine',
        type: 'virtual_machine',
        status: 'online'
      },
      {
        name: 'Network Router',
        type: 'router',
        status: 'online'
      },
      {
        name: 'Network Switch',
        type: 'switch',
        status: 'online'
      },
      {
        name: 'WiFi Access Point',
        type: 'access_point',
        status: 'online'
      },
      {
        name: 'Storage Array',
        type: 'storage',
        status: 'online'
      }
    ]).execute();

    // Test each device type
    const deviceTypes = ['physical_server', 'virtual_machine', 'router', 'switch', 'access_point', 'storage'] as const;

    for (const deviceType of deviceTypes) {
      const input: GetDevicesByTypeInput = {
        type: deviceType
      };

      const result = await getDevicesByType(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toEqual(deviceType);
      expect(result[0].status).toEqual('online');
    }
  });

  it('should preserve all device fields correctly', async () => {
    // Create a device with all fields populated
    await db.insert(devicesTable).values({
      name: 'Complete Device',
      type: 'physical_server',
      ip_address: '192.168.100.50',
      make: 'SuperMicro',
      model: 'SYS-2029P-C1R',
      operating_system: 'Windows Server 2022',
      cpu: 'Intel Xeon Scalable 6230',
      ram: 128,
      storage_capacity: 8000,
      status: 'error',
      notes: 'Device with all fields populated for testing'
    }).execute();

    const input: GetDevicesByTypeInput = {
      type: 'physical_server'
    };

    const result = await getDevicesByType(input);

    expect(result).toHaveLength(1);
    
    const device = result[0];
    expect(device.id).toBeDefined();
    expect(device.name).toEqual('Complete Device');
    expect(device.type).toEqual('physical_server');
    expect(device.ip_address).toEqual('192.168.100.50');
    expect(device.make).toEqual('SuperMicro');
    expect(device.model).toEqual('SYS-2029P-C1R');
    expect(device.operating_system).toEqual('Windows Server 2022');
    expect(device.cpu).toEqual('Intel Xeon Scalable 6230');
    expect(device.ram).toEqual(128);
    expect(device.storage_capacity).toEqual(8000);
    expect(device.status).toEqual('error');
    expect(device.notes).toEqual('Device with all fields populated for testing');
    expect(device.created_at).toBeInstanceOf(Date);
    expect(device.updated_at).toBeInstanceOf(Date);
  });
});