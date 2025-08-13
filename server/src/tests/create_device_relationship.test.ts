import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type CreateDeviceRelationshipInput } from '../schema';
import { createDeviceRelationship } from '../handlers/create_device_relationship';
import { eq } from 'drizzle-orm';

describe('createDeviceRelationship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentDeviceId: number;
  let childDeviceId: number;

  beforeEach(async () => {
    // Create test devices for relationship testing
    const parentResult = await db.insert(devicesTable)
      .values({
        name: 'Parent Server',
        type: 'physical_server',
        ip_address: '192.168.1.100',
        status: 'online'
      })
      .returning()
      .execute();

    const childResult = await db.insert(devicesTable)
      .values({
        name: 'Child VM',
        type: 'virtual_machine',
        ip_address: '192.168.1.101',
        status: 'online'
      })
      .returning()
      .execute();

    parentDeviceId = parentResult[0].id;
    childDeviceId = childResult[0].id;
  });

  it('should create a device relationship successfully', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: childDeviceId,
      relationship_type: 'hosted_on',
      description: 'VM hosted on physical server'
    };

    const result = await createDeviceRelationship(testInput);

    // Verify return values
    expect(result.id).toBeDefined();
    expect(result.parent_device_id).toEqual(parentDeviceId);
    expect(result.child_device_id).toEqual(childDeviceId);
    expect(result.relationship_type).toEqual('hosted_on');
    expect(result.description).toEqual('VM hosted on physical server');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create relationship with null description when not provided', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: childDeviceId,
      relationship_type: 'connected_to'
    };

    const result = await createDeviceRelationship(testInput);

    expect(result.description).toBeNull();
    expect(result.relationship_type).toEqual('connected_to');
  });

  it('should save relationship to database correctly', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: childDeviceId,
      relationship_type: 'manages',
      description: 'Server manages storage'
    };

    const result = await createDeviceRelationship(testInput);

    // Query database to verify persistence
    const relationships = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, result.id))
      .execute();

    expect(relationships).toHaveLength(1);
    expect(relationships[0].parent_device_id).toEqual(parentDeviceId);
    expect(relationships[0].child_device_id).toEqual(childDeviceId);
    expect(relationships[0].relationship_type).toEqual('manages');
    expect(relationships[0].description).toEqual('Server manages storage');
    expect(relationships[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when parent device does not exist', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: 99999, // Non-existent device ID
      child_device_id: childDeviceId,
      relationship_type: 'hosted_on'
    };

    await expect(createDeviceRelationship(testInput)).rejects.toThrow(/Parent device with ID 99999 does not exist/i);
  });

  it('should throw error when child device does not exist', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: 99999, // Non-existent device ID
      relationship_type: 'hosted_on'
    };

    await expect(createDeviceRelationship(testInput)).rejects.toThrow(/Child device with ID 99999 does not exist/i);
  });

  it('should throw error when both devices do not exist', async () => {
    const testInput: CreateDeviceRelationshipInput = {
      parent_device_id: 99998,
      child_device_id: 99999,
      relationship_type: 'connected_to'
    };

    await expect(createDeviceRelationship(testInput)).rejects.toThrow(/Parent device with ID 99998 does not exist/i);
  });

  it('should handle all relationship types correctly', async () => {
    const relationshipTypes = ['hosted_on', 'connected_to', 'manages', 'stores_on'] as const;
    
    for (const relType of relationshipTypes) {
      const testInput: CreateDeviceRelationshipInput = {
        parent_device_id: parentDeviceId,
        child_device_id: childDeviceId,
        relationship_type: relType,
        description: `Test ${relType} relationship`
      };

      const result = await createDeviceRelationship(testInput);
      
      expect(result.relationship_type).toEqual(relType);
      expect(result.description).toEqual(`Test ${relType} relationship`);
      
      // Clean up for next iteration
      await db.delete(deviceRelationshipsTable)
        .where(eq(deviceRelationshipsTable.id, result.id))
        .execute();
    }
  });

  it('should allow multiple relationships between same devices with different types', async () => {
    // Create first relationship
    const firstInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: childDeviceId,
      relationship_type: 'hosted_on',
      description: 'VM hosted on server'
    };

    const firstResult = await createDeviceRelationship(firstInput);

    // Create second relationship with different type
    const secondInput: CreateDeviceRelationshipInput = {
      parent_device_id: parentDeviceId,
      child_device_id: childDeviceId,
      relationship_type: 'manages',
      description: 'Server manages VM'
    };

    const secondResult = await createDeviceRelationship(secondInput);

    // Verify both relationships exist
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.relationship_type).toEqual('hosted_on');
    expect(secondResult.relationship_type).toEqual('manages');

    // Verify in database
    const allRelationships = await db.select()
      .from(deviceRelationshipsTable)
      .execute();

    expect(allRelationships).toHaveLength(2);
  });
});