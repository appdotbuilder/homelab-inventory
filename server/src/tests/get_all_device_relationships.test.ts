import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, deviceRelationshipsTable } from '../db/schema';
import { getAllDeviceRelationships } from '../handlers/get_all_device_relationships';

describe('getAllDeviceRelationships', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no relationships exist', async () => {
    const result = await getAllDeviceRelationships();
    
    expect(result).toEqual([]);
  });

  it('should return all device relationships', async () => {
    // Create test devices first
    const deviceResults = await db.insert(devicesTable)
      .values([
        {
          name: 'Server 1',
          type: 'physical_server',
          status: 'online'
        },
        {
          name: 'VM 1',
          type: 'virtual_machine', 
          status: 'online'
        },
        {
          name: 'Storage 1',
          type: 'storage',
          status: 'online'
        }
      ])
      .returning()
      .execute();

    const server = deviceResults[0];
    const vm = deviceResults[1];
    const storage = deviceResults[2];

    // Create test relationships
    const relationshipData = [
      {
        parent_device_id: server.id,
        child_device_id: vm.id,
        relationship_type: 'hosted_on' as const,
        description: 'VM hosted on physical server'
      },
      {
        parent_device_id: server.id,
        child_device_id: storage.id,
        relationship_type: 'connected_to' as const,
        description: 'Server connected to storage'
      }
    ];

    await db.insert(deviceRelationshipsTable)
      .values(relationshipData)
      .execute();

    const result = await getAllDeviceRelationships();

    // Should return all relationships
    expect(result).toHaveLength(2);
    
    // Verify first relationship
    const firstRelationship = result.find(r => r.child_device_id === vm.id);
    expect(firstRelationship).toBeDefined();
    expect(firstRelationship!.parent_device_id).toEqual(server.id);
    expect(firstRelationship!.relationship_type).toEqual('hosted_on');
    expect(firstRelationship!.description).toEqual('VM hosted on physical server');
    expect(firstRelationship!.id).toBeDefined();
    expect(firstRelationship!.created_at).toBeInstanceOf(Date);

    // Verify second relationship
    const secondRelationship = result.find(r => r.child_device_id === storage.id);
    expect(secondRelationship).toBeDefined();
    expect(secondRelationship!.parent_device_id).toEqual(server.id);
    expect(secondRelationship!.relationship_type).toEqual('connected_to');
    expect(secondRelationship!.description).toEqual('Server connected to storage');
    expect(secondRelationship!.id).toBeDefined();
    expect(secondRelationship!.created_at).toBeInstanceOf(Date);
  });

  it('should return all relationships with different types', async () => {
    // Create test devices
    const deviceResults = await db.insert(devicesTable)
      .values([
        {
          name: 'Router',
          type: 'router',
          status: 'online'
        },
        {
          name: 'Switch',
          type: 'switch',
          status: 'online'
        },
        {
          name: 'Access Point',
          type: 'access_point',
          status: 'online'
        },
        {
          name: 'Server',
          type: 'physical_server',
          status: 'online'
        }
      ])
      .returning()
      .execute();

    const router = deviceResults[0];
    const switch1 = deviceResults[1];
    const accessPoint = deviceResults[2];
    const server = deviceResults[3];

    // Create relationships with different types
    await db.insert(deviceRelationshipsTable)
      .values([
        {
          parent_device_id: router.id,
          child_device_id: switch1.id,
          relationship_type: 'manages',
          description: 'Router manages switch'
        },
        {
          parent_device_id: switch1.id,
          child_device_id: accessPoint.id,
          relationship_type: 'connected_to',
          description: 'Switch connected to AP'
        },
        {
          parent_device_id: switch1.id,
          child_device_id: server.id,
          relationship_type: 'connected_to',
          description: 'Switch connected to server'
        }
      ])
      .execute();

    const result = await getAllDeviceRelationships();

    expect(result).toHaveLength(3);
    
    // Verify all relationship types are present
    const relationshipTypes = result.map(r => r.relationship_type);
    expect(relationshipTypes).toContain('manages');
    expect(relationshipTypes).toContain('connected_to');
    
    // Verify specific relationships
    const managesRelationship = result.find(r => r.relationship_type === 'manages');
    expect(managesRelationship!.parent_device_id).toEqual(router.id);
    expect(managesRelationship!.child_device_id).toEqual(switch1.id);
    
    const connectedRelationships = result.filter(r => r.relationship_type === 'connected_to');
    expect(connectedRelationships).toHaveLength(2);
  });

  it('should handle relationships with null descriptions', async () => {
    // Create test devices
    const deviceResults = await db.insert(devicesTable)
      .values([
        {
          name: 'Device A',
          type: 'router',
          status: 'online'
        },
        {
          name: 'Device B',
          type: 'switch',
          status: 'online'
        }
      ])
      .returning()
      .execute();

    // Create relationship without description
    await db.insert(deviceRelationshipsTable)
      .values([
        {
          parent_device_id: deviceResults[0].id,
          child_device_id: deviceResults[1].id,
          relationship_type: 'connected_to',
          description: null
        }
      ])
      .execute();

    const result = await getAllDeviceRelationships();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].parent_device_id).toEqual(deviceResults[0].id);
    expect(result[0].child_device_id).toEqual(deviceResults[1].id);
    expect(result[0].relationship_type).toEqual('connected_to');
  });

  it('should verify database persistence', async () => {
    // Create test devices
    const deviceResults = await db.insert(devicesTable)
      .values([
        {
          name: 'Test Device 1',
          type: 'physical_server',
          status: 'online'
        },
        {
          name: 'Test Device 2',
          type: 'virtual_machine',
          status: 'online'
        }
      ])
      .returning()
      .execute();

    // Create relationship
    await db.insert(deviceRelationshipsTable)
      .values([
        {
          parent_device_id: deviceResults[0].id,
          child_device_id: deviceResults[1].id,
          relationship_type: 'hosted_on',
          description: 'Test relationship'
        }
      ])
      .execute();

    // Get relationships via handler
    const handlerResult = await getAllDeviceRelationships();

    // Verify via direct database query
    const directResult = await db.select()
      .from(deviceRelationshipsTable)
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(directResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(directResult[0].id);
    expect(handlerResult[0].parent_device_id).toEqual(directResult[0].parent_device_id);
    expect(handlerResult[0].child_device_id).toEqual(directResult[0].child_device_id);
    expect(handlerResult[0].relationship_type).toEqual(directResult[0].relationship_type);
    expect(handlerResult[0].description).toEqual(directResult[0].description);
    expect(handlerResult[0].created_at).toEqual(directResult[0].created_at);
  });
});