import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type GetDeviceRelationshipsInput, type CreateDeviceInput } from '../schema';
import { getDeviceRelationships } from '../handlers/get_device_relationships';

describe('getDeviceRelationships', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test devices
  const createTestDevice = async (name: string, type: CreateDeviceInput['type'] = 'physical_server') => {
    const result = await db.insert(devicesTable)
      .values({
        name,
        type,
        status: 'offline'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test relationship
  const createTestRelationship = async (
    parentId: number, 
    childId: number, 
    type: 'hosted_on' | 'connected_to' | 'manages' | 'stores_on' = 'hosted_on', 
    description?: string
  ) => {
    const result = await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: parentId,
        child_device_id: childId,
        relationship_type: type,
        description
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return all relationships when no filters provided', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Router 1', 'router');

    // Create test relationships
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on', 'VM hosted on server');
    const relationship2 = await createTestRelationship(device1.id, device3.id, 'connected_to', 'Server connected to router');

    const input: GetDeviceRelationshipsInput = {};
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.id).sort()).toEqual([relationship1.id, relationship2.id].sort());
    
    // Check relationship details
    const rel1 = result.find(r => r.id === relationship1.id);
    expect(rel1).toBeDefined();
    expect(rel1!.parent_device_id).toEqual(device1.id);
    expect(rel1!.child_device_id).toEqual(device2.id);
    expect(rel1!.relationship_type).toEqual('hosted_on');
    expect(rel1!.description).toEqual('VM hosted on server');
    expect(rel1!.created_at).toBeInstanceOf(Date);
  });

  it('should filter relationships by device_id (as parent)', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Router 1', 'router');
    const device4 = await createTestDevice('VM 2', 'virtual_machine');

    // Create test relationships
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on');
    const relationship2 = await createTestRelationship(device1.id, device4.id, 'hosted_on');
    await createTestRelationship(device3.id, device2.id, 'connected_to'); // Should not be included

    const input: GetDeviceRelationshipsInput = {
      device_id: device1.id
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.id).sort()).toEqual([relationship1.id, relationship2.id].sort());
    
    // All relationships should have device1 as parent
    result.forEach(rel => {
      expect(rel.parent_device_id).toEqual(device1.id);
    });
  });

  it('should filter relationships by device_id (as child)', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Router 1', 'router');

    // Create test relationships
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on');
    const relationship2 = await createTestRelationship(device3.id, device2.id, 'manages');
    await createTestRelationship(device1.id, device3.id, 'connected_to'); // Should not be included

    const input: GetDeviceRelationshipsInput = {
      device_id: device2.id
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.id).sort()).toEqual([relationship1.id, relationship2.id].sort());
    
    // All relationships should have device2 as child
    result.forEach(rel => {
      expect(rel.child_device_id).toEqual(device2.id);
    });
  });

  it('should filter relationships by relationship_type', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('VM 2', 'virtual_machine');
    const device4 = await createTestDevice('Router 1', 'router');

    // Create test relationships
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on');
    const relationship2 = await createTestRelationship(device1.id, device3.id, 'hosted_on');
    await createTestRelationship(device1.id, device4.id, 'connected_to'); // Should not be included

    const input: GetDeviceRelationshipsInput = {
      relationship_type: 'hosted_on'
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.id).sort()).toEqual([relationship1.id, relationship2.id].sort());
    
    // All relationships should be 'hosted_on' type
    result.forEach(rel => {
      expect(rel.relationship_type).toEqual('hosted_on');
    });
  });

  it('should filter by both device_id and relationship_type', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Router 1', 'router');

    // Create test relationships
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on');
    await createTestRelationship(device1.id, device3.id, 'connected_to'); // Wrong type
    await createTestRelationship(device3.id, device2.id, 'hosted_on'); // Wrong device

    const input: GetDeviceRelationshipsInput = {
      device_id: device1.id,
      relationship_type: 'hosted_on'
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(relationship1.id);
    expect(result[0].parent_device_id).toEqual(device1.id);
    expect(result[0].relationship_type).toEqual('hosted_on');
  });

  it('should return empty array when no relationships match filters', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');

    // Create test relationship
    await createTestRelationship(device1.id, device2.id, 'hosted_on');

    const input: GetDeviceRelationshipsInput = {
      device_id: 999 // Non-existent device
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no relationships exist', async () => {
    // Create devices but no relationships
    await createTestDevice('Server 1', 'physical_server');
    await createTestDevice('VM 1', 'virtual_machine');

    const input: GetDeviceRelationshipsInput = {};
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(0);
  });

  it('should handle all relationship types correctly', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Router 1', 'router');
    const device4 = await createTestDevice('Storage 1', 'storage');

    // Create relationships of each type
    const rel1 = await createTestRelationship(device1.id, device2.id, 'hosted_on');
    const rel2 = await createTestRelationship(device1.id, device3.id, 'connected_to');
    const rel3 = await createTestRelationship(device1.id, device4.id, 'manages');
    const rel4 = await createTestRelationship(device2.id, device4.id, 'stores_on');

    // Test each relationship type filter
    const relationshipTypes = ['hosted_on', 'connected_to', 'manages', 'stores_on'] as const;
    const expectedIds = [rel1.id, rel2.id, rel3.id, rel4.id];

    for (let i = 0; i < relationshipTypes.length; i++) {
      const input: GetDeviceRelationshipsInput = {
        relationship_type: relationshipTypes[i]
      };
      const result = await getDeviceRelationships(input);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(expectedIds[i]);
      expect(result[0].relationship_type).toEqual(relationshipTypes[i]);
    }
  });

  it('should handle device as both parent and child in same query', async () => {
    // Create test devices
    const device1 = await createTestDevice('Server 1', 'physical_server');
    const device2 = await createTestDevice('VM 1', 'virtual_machine');
    const device3 = await createTestDevice('Storage 1', 'storage');

    // Create relationships where device2 is both parent and child
    const relationship1 = await createTestRelationship(device1.id, device2.id, 'hosted_on'); // device2 as child
    const relationship2 = await createTestRelationship(device2.id, device3.id, 'stores_on'); // device2 as parent

    const input: GetDeviceRelationshipsInput = {
      device_id: device2.id
    };
    const result = await getDeviceRelationships(input);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.id).sort()).toEqual([relationship1.id, relationship2.id].sort());

    // Verify device2 appears in both parent and child roles
    const asChild = result.find(r => r.child_device_id === device2.id);
    const asParent = result.find(r => r.parent_device_id === device2.id);
    
    expect(asChild).toBeDefined();
    expect(asParent).toBeDefined();
    expect(asChild!.parent_device_id).toEqual(device1.id);
    expect(asParent!.child_device_id).toEqual(device3.id);
  });
});