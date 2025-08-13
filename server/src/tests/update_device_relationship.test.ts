import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type UpdateDeviceRelationshipInput, type CreateDeviceInput } from '../schema';
import { updateDeviceRelationship } from '../handlers/update_device_relationship';
import { eq } from 'drizzle-orm';

// Helper function to create a test device
const createTestDevice = async (name: string): Promise<number> => {
  const deviceInput: CreateDeviceInput = {
    name: name,
    type: 'physical_server',
    ip_address: '192.168.1.10',
    make: 'Dell',
    model: 'PowerEdge R740',
    operating_system: 'Ubuntu 20.04',
    cpu: 'Intel Xeon Silver 4214',
    ram: 32,
    storage_capacity: 1000,
    status: 'online',
    notes: 'Test device'
  };

  const result = await db.insert(devicesTable)
    .values({
      name: deviceInput.name,
      type: deviceInput.type,
      ip_address: deviceInput.ip_address,
      make: deviceInput.make,
      model: deviceInput.model,
      operating_system: deviceInput.operating_system,
      cpu: deviceInput.cpu,
      ram: deviceInput.ram,
      storage_capacity: deviceInput.storage_capacity,
      status: deviceInput.status,
      notes: deviceInput.notes
    })
    .returning()
    .execute();

  return result[0].id;
};

// Helper function to create a test relationship
const createTestRelationship = async (parentId: number, childId: number): Promise<number> => {
  const result = await db.insert(deviceRelationshipsTable)
    .values({
      parent_device_id: parentId,
      child_device_id: childId,
      relationship_type: 'hosted_on',
      description: 'Test relationship'
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateDeviceRelationship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a device relationship successfully', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      relationship_type: 'manages',
      description: 'Updated description'
    };

    const result = await updateDeviceRelationship(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(relationshipId);
    expect(result!.parent_device_id).toEqual(parentDeviceId);
    expect(result!.child_device_id).toEqual(childDeviceId);
    expect(result!.relationship_type).toEqual('manages');
    expect(result!.description).toEqual('Updated description');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should update parent device ID', async () => {
    // Create test devices
    const originalParentId = await createTestDevice('Original Parent');
    const newParentId = await createTestDevice('New Parent');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(originalParentId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      parent_device_id: newParentId
    };

    const result = await updateDeviceRelationship(input);

    expect(result).not.toBeNull();
    expect(result!.parent_device_id).toEqual(newParentId);
    expect(result!.child_device_id).toEqual(childDeviceId);
  });

  it('should update child device ID', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const originalChildId = await createTestDevice('Original Child');
    const newChildId = await createTestDevice('New Child');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, originalChildId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      child_device_id: newChildId
    };

    const result = await updateDeviceRelationship(input);

    expect(result).not.toBeNull();
    expect(result!.parent_device_id).toEqual(parentDeviceId);
    expect(result!.child_device_id).toEqual(newChildId);
  });

  it('should return null for non-existent relationship', async () => {
    const input: UpdateDeviceRelationshipInput = {
      id: 99999,
      description: 'This should not work'
    };

    const result = await updateDeviceRelationship(input);

    expect(result).toBeNull();
  });

  it('should save updated relationship to database', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      relationship_type: 'connected_to',
      description: 'Network connection'
    };

    await updateDeviceRelationship(input);

    // Verify in database
    const savedRelationship = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, relationshipId))
      .execute();

    expect(savedRelationship).toHaveLength(1);
    expect(savedRelationship[0].relationship_type).toEqual('connected_to');
    expect(savedRelationship[0].description).toEqual('Network connection');
    expect(savedRelationship[0].parent_device_id).toEqual(parentDeviceId);
    expect(savedRelationship[0].child_device_id).toEqual(childDeviceId);
  });

  it('should return existing relationship when no fields to update', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId
    };

    const result = await updateDeviceRelationship(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(relationshipId);
    expect(result!.parent_device_id).toEqual(parentDeviceId);
    expect(result!.child_device_id).toEqual(childDeviceId);
    expect(result!.relationship_type).toEqual('hosted_on');
    expect(result!.description).toEqual('Test relationship');
  });

  it('should throw error for non-existent parent device', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      parent_device_id: 99999
    };

    await expect(updateDeviceRelationship(input)).rejects.toThrow(/Parent device with ID 99999 does not exist/i);
  });

  it('should throw error for non-existent child device', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      child_device_id: 99999
    };

    await expect(updateDeviceRelationship(input)).rejects.toThrow(/Child device with ID 99999 does not exist/i);
  });

  it('should prevent self-relationship when updating parent', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      parent_device_id: childDeviceId // Same as child
    };

    await expect(updateDeviceRelationship(input)).rejects.toThrow(/A device cannot have a relationship with itself/i);
  });

  it('should prevent self-relationship when updating child', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      child_device_id: parentDeviceId // Same as parent
    };

    await expect(updateDeviceRelationship(input)).rejects.toThrow(/A device cannot have a relationship with itself/i);
  });

  it('should prevent self-relationship when updating both parent and child to same device', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    const sameDeviceId = await createTestDevice('Same Device');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      parent_device_id: sameDeviceId,
      child_device_id: sameDeviceId
    };

    await expect(updateDeviceRelationship(input)).rejects.toThrow(/A device cannot have a relationship with itself/i);
  });

  it('should update multiple fields at once', async () => {
    // Create test devices
    const parentDeviceId = await createTestDevice('Parent Server');
    const childDeviceId = await createTestDevice('Child VM');
    const newParentId = await createTestDevice('New Parent');
    
    // Create test relationship
    const relationshipId = await createTestRelationship(parentDeviceId, childDeviceId);

    const input: UpdateDeviceRelationshipInput = {
      id: relationshipId,
      parent_device_id: newParentId,
      relationship_type: 'stores_on',
      description: 'Storage relationship'
    };

    const result = await updateDeviceRelationship(input);

    expect(result).not.toBeNull();
    expect(result!.parent_device_id).toEqual(newParentId);
    expect(result!.child_device_id).toEqual(childDeviceId);
    expect(result!.relationship_type).toEqual('stores_on');
    expect(result!.description).toEqual('Storage relationship');
  });
});