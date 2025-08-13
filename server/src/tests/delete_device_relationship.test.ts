import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { type DeleteDeviceRelationshipInput } from '../schema';
import { deleteDeviceRelationship } from '../handlers/delete_device_relationship';
import { eq } from 'drizzle-orm';

describe('deleteDeviceRelationship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentDeviceId: number;
  let childDeviceId: number;
  let relationshipId: number;

  beforeEach(async () => {
    // Create test devices first
    const parentDevice = await db.insert(devicesTable)
      .values({
        name: 'Parent Server',
        type: 'physical_server',
        status: 'online'
      })
      .returning()
      .execute();

    const childDevice = await db.insert(devicesTable)
      .values({
        name: 'Child VM',
        type: 'virtual_machine', 
        status: 'online'
      })
      .returning()
      .execute();

    parentDeviceId = parentDevice[0].id;
    childDeviceId = childDevice[0].id;

    // Create a test relationship
    const relationship = await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: parentDeviceId,
        child_device_id: childDeviceId,
        relationship_type: 'hosted_on',
        description: 'Test relationship'
      })
      .returning()
      .execute();

    relationshipId = relationship[0].id;
  });

  it('should successfully delete an existing relationship', async () => {
    const input: DeleteDeviceRelationshipInput = {
      id: relationshipId
    };

    const result = await deleteDeviceRelationship(input);

    expect(result.success).toBe(true);
  });

  it('should remove the relationship from database', async () => {
    const input: DeleteDeviceRelationshipInput = {
      id: relationshipId
    };

    await deleteDeviceRelationship(input);

    // Verify the relationship was deleted
    const relationships = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, relationshipId))
      .execute();

    expect(relationships).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent relationship', async () => {
    const input: DeleteDeviceRelationshipInput = {
      id: 99999 // Non-existent ID
    };

    const result = await deleteDeviceRelationship(input);

    expect(result.success).toBe(false);
  });

  it('should not affect other relationships when deleting specific one', async () => {
    // Create another relationship
    const anotherRelationship = await db.insert(deviceRelationshipsTable)
      .values({
        parent_device_id: parentDeviceId,
        child_device_id: childDeviceId,
        relationship_type: 'manages',
        description: 'Another relationship'
      })
      .returning()
      .execute();

    const anotherRelationshipId = anotherRelationship[0].id;

    // Delete only the first relationship
    const input: DeleteDeviceRelationshipInput = {
      id: relationshipId
    };

    await deleteDeviceRelationship(input);

    // Verify first relationship is deleted
    const deletedRelationship = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, relationshipId))
      .execute();

    expect(deletedRelationship).toHaveLength(0);

    // Verify second relationship still exists
    const remainingRelationship = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, anotherRelationshipId))
      .execute();

    expect(remainingRelationship).toHaveLength(1);
    expect(remainingRelationship[0].relationship_type).toEqual('manages');
  });

  it('should handle cascade deletion when parent device is deleted', async () => {
    // Delete the parent device - this should cascade and delete the relationship
    await db.delete(devicesTable)
      .where(eq(devicesTable.id, parentDeviceId))
      .execute();

    // Verify the relationship was cascade deleted
    const relationships = await db.select()
      .from(deviceRelationshipsTable)
      .where(eq(deviceRelationshipsTable.id, relationshipId))
      .execute();

    expect(relationships).toHaveLength(0);

    // Attempting to delete the already cascade-deleted relationship should return false
    const input: DeleteDeviceRelationshipInput = {
      id: relationshipId
    };

    const result = await deleteDeviceRelationship(input);
    expect(result.success).toBe(false);
  });
});