import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type DeleteDeviceInput } from '../schema';
import { deleteDevice } from '../handlers/delete_device';
import { eq } from 'drizzle-orm';

// Test input for deletion
const testDeleteInput: DeleteDeviceInput = {
  id: 1
};

describe('deleteDevice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing device', async () => {
    // Create a test device first
    const deviceResult = await db.insert(devicesTable)
      .values({
        name: 'Test Server',
        type: 'physical_server',
        ip_address: '192.168.1.10',
        make: 'Dell',
        model: 'PowerEdge R740',
        operating_system: 'Ubuntu 22.04',
        cpu: 'Intel Xeon Silver 4210',
        ram: 32,
        storage_capacity: 1000,
        status: 'online',
        notes: 'Production server'
      })
      .returning()
      .execute();

    const createdDevice = deviceResult[0];
    
    // Delete the device
    const result = await deleteDevice({ id: createdDevice.id });

    // Should return success true
    expect(result.success).toBe(true);

    // Verify device is deleted from database
    const devices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, createdDevice.id))
      .execute();

    expect(devices).toHaveLength(0);
  });

  it('should return false when deleting non-existent device', async () => {
    // Try to delete a device that doesn't exist
    const result = await deleteDevice({ id: 999 });

    // Should return success false
    expect(result.success).toBe(false);
  });

  it('should cascade delete related device relationships', async () => {
    // Create two test devices
    const parentDeviceResult = await db.insert(devicesTable)
      .values({
        name: 'Parent Server',
        type: 'physical_server',
        status: 'online'
      })
      .returning()
      .execute();

    const childDeviceResult = await db.insert(devicesTable)
      .values({
        name: 'Child VM',
        type: 'virtual_machine',
        status: 'online'
      })
      .returning()
      .execute();

    const parentDevice = parentDeviceResult[0];
    const childDevice = childDeviceResult[0];

    // Create a relationship between them
    const relationshipResult = await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: parentDevice.id,
        child_device_id: childDevice.id,
        relationship_type: 'hosted_on',
        description: 'VM hosted on server'
      })
      .returning()
      .execute();

    const createdRelationship = relationshipResult[0];

    // Delete the parent device
    const result = await deleteDevice({ id: parentDevice.id });

    // Should return success true
    expect(result.success).toBe(true);

    // Verify parent device is deleted
    const parentDevices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, parentDevice.id))
      .execute();

    expect(parentDevices).toHaveLength(0);

    // Verify relationship is cascade deleted
    const relationships = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, createdRelationship.id))
      .execute();

    expect(relationships).toHaveLength(0);

    // Verify child device still exists (only relationship was deleted)
    const childDevices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, childDevice.id))
      .execute();

    expect(childDevices).toHaveLength(1);
  });

  it('should handle multiple relationships when deleting device', async () => {
    // Create three devices
    const devices = await db.insert(devicesTable)
      .values([
        { name: 'Main Server', type: 'physical_server', status: 'online' },
        { name: 'VM 1', type: 'virtual_machine', status: 'online' },
        { name: 'VM 2', type: 'virtual_machine', status: 'online' }
      ])
      .returning()
      .execute();

    const [mainServer, vm1, vm2] = devices;

    // Create multiple relationships
    await db.insert(deviceRelationshipsTable)
      .values([
        {
          parent_device_id: mainServer.id,
          child_device_id: vm1.id,
          relationship_type: 'hosted_on'
        },
        {
          parent_device_id: mainServer.id,
          child_device_id: vm2.id,
          relationship_type: 'hosted_on'
        }
      ])
      .execute();

    // Delete the main server
    const result = await deleteDevice({ id: mainServer.id });

    // Should return success true
    expect(result.success).toBe(true);

    // Verify all relationships involving the main server are deleted
    const remainingRelationships = await db.select()
      .from(deviceRelationshipsTable)
      .execute();

    expect(remainingRelationships).toHaveLength(0);

    // Verify VMs still exist
    const remainingDevices = await db.select()
      .from(devicesTable)
      .execute();

    expect(remainingDevices).toHaveLength(2);
    expect(remainingDevices.map(d => d.name).sort()).toEqual(['VM 1', 'VM 2']);
  });

  it('should delete device that is a child in relationships', async () => {
    // Create parent and child devices
    const devices = await db.insert(devicesTable)
      .values([
        { name: 'Host Server', type: 'physical_server', status: 'online' },
        { name: 'Guest VM', type: 'virtual_machine', status: 'online' }
      ])
      .returning()
      .execute();

    const [hostServer, guestVM] = devices;

    // Create relationship
    await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: hostServer.id,
        child_device_id: guestVM.id,
        relationship_type: 'hosted_on'
      })
      .execute();

    // Delete the child device (guest VM)
    const result = await deleteDevice({ id: guestVM.id });

    // Should return success true
    expect(result.success).toBe(true);

    // Verify child device is deleted
    const childDevices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, guestVM.id))
      .execute();

    expect(childDevices).toHaveLength(0);

    // Verify relationship is cascade deleted
    const relationships = await db.select()
      .from(deviceRelationshipsTable)
      .execute();

    expect(relationships).toHaveLength(0);

    // Verify parent device still exists
    const parentDevices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, hostServer.id))
      .execute();

    expect(parentDevices).toHaveLength(1);
  });
});