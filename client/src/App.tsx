import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  Device, 
  CreateDeviceInput, 
  DeviceRelationship, 
  CreateDeviceRelationshipInput,
  DeviceType,
  DeviceStatus,
  RelationshipType
} from '../../server/src/schema';

// Device type options with icons
const deviceTypes: { value: DeviceType; label: string; icon: string }[] = [
  { value: 'physical_server', label: 'Physical Server', icon: '🖥️' },
  { value: 'virtual_machine', label: 'Virtual Machine', icon: '💻' },
  { value: 'router', label: 'Router', icon: '🌐' },
  { value: 'switch', label: 'Switch', icon: '🔄' },
  { value: 'access_point', label: 'Access Point', icon: '📶' },
  { value: 'storage', label: 'Storage', icon: '💾' }
];

const deviceStatuses: { value: DeviceStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: 'bg-green-100 text-green-800' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-100 text-gray-800' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' }
];

const relationshipTypes: { value: RelationshipType; label: string }[] = [
  { value: 'hosted_on', label: 'Hosted On' },
  { value: 'connected_to', label: 'Connected To' },
  { value: 'manages', label: 'Manages' },
  { value: 'stores_on', label: 'Stores On' }
];

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [relationships, setRelationships] = useState<DeviceRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | 'all'>('all');
  
  // Device form state
  const [deviceFormData, setDeviceFormData] = useState<CreateDeviceInput>({
    name: '',
    type: 'physical_server',
    ip_address: null,
    make: null,
    model: null,
    operating_system: null,
    cpu: null,
    ram: null,
    storage_capacity: null,
    status: 'offline',
    notes: null
  });

  // Relationship form state
  const [relationshipFormData, setRelationshipFormData] = useState<CreateDeviceRelationshipInput>({
    parent_device_id: 0,
    child_device_id: 0,
    relationship_type: 'hosted_on',
    description: null
  });

  // Load devices and relationships
  const loadData = useCallback(async () => {
    try {
      const [devicesResult, relationshipsResult] = await Promise.all([
        trpc.getDevices.query(),
        trpc.getAllDeviceRelationships.query()
      ]);
      setDevices(devicesResult);
      setRelationships(relationshipsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle device creation
  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newDevice = await trpc.createDevice.mutate(deviceFormData);
      setDevices((prev: Device[]) => [...prev, newDevice]);
      // Reset form
      setDeviceFormData({
        name: '',
        type: 'physical_server',
        ip_address: null,
        make: null,
        model: null,
        operating_system: null,
        cpu: null,
        ram: null,
        storage_capacity: null,
        status: 'offline',
        notes: null
      });
    } catch (error) {
      console.error('Failed to create device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle relationship creation
  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newRelationship = await trpc.createDeviceRelationship.mutate(relationshipFormData);
      setRelationships((prev: DeviceRelationship[]) => [...prev, newRelationship]);
      // Reset form
      setRelationshipFormData({
        parent_device_id: 0,
        child_device_id: 0,
        relationship_type: 'hosted_on',
        description: null
      });
    } catch (error) {
      console.error('Failed to create relationship:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter devices by type
  const filteredDevices = selectedDeviceType === 'all' 
    ? devices 
    : devices.filter((device: Device) => device.type === selectedDeviceType);

  // Get device name by ID for relationships
  const getDeviceName = (id: number): string => {
    const device = devices.find((d: Device) => d.id === id);
    return device ? device.name : `Device ${id}`;
  };

  // Get device type icon
  const getDeviceTypeIcon = (type: DeviceType): string => {
    const deviceType = deviceTypes.find(t => t.value === type);
    return deviceType ? deviceType.icon : '📦';
  };

  // Get status badge color
  const getStatusBadge = (status: DeviceStatus) => {
    const statusInfo = deviceStatuses.find(s => s.value === status);
    return statusInfo || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏠 Home Lab Inventory</h1>
          <p className="text-lg text-gray-600">Manage your servers, network devices, and their relationships</p>
        </div>

        <Alert className="mb-6">
          <AlertDescription>
            📝 <strong>Note:</strong> This application uses placeholder backend handlers. Device and relationship data will reset on page refresh until the database is implemented.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="devices">🖥️ Devices</TabsTrigger>
            <TabsTrigger value="add-device">➕ Add Device</TabsTrigger>
            <TabsTrigger value="relationships">🔗 Relationships</TabsTrigger>
            <TabsTrigger value="add-relationship">🔗 Add Relationship</TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Device Inventory</span>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="device-filter">Filter by type:</Label>
                    <Select value={selectedDeviceType} onValueChange={(value: DeviceType | 'all') => setSelectedDeviceType(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {deviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No devices found. Add some devices to get started!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDevices.map((device: Device) => {
                      const statusBadge = getStatusBadge(device.status);
                      return (
                        <Card key={device.id} className="relative">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg">
                              <span className="flex items-center gap-2">
                                <span className="text-2xl">{getDeviceTypeIcon(device.type)}</span>
                                {device.name}
                              </span>
                              <Badge className={statusBadge.color}>
                                {statusBadge.label}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <Label className="text-xs text-gray-500">Type</Label>
                                <p>{deviceTypes.find(t => t.value === device.type)?.label}</p>
                              </div>
                              {device.ip_address && (
                                <div>
                                  <Label className="text-xs text-gray-500">IP Address</Label>
                                  <p className="font-mono">{device.ip_address}</p>
                                </div>
                              )}
                              {device.make && (
                                <div>
                                  <Label className="text-xs text-gray-500">Make</Label>
                                  <p>{device.make}</p>
                                </div>
                              )}
                              {device.model && (
                                <div>
                                  <Label className="text-xs text-gray-500">Model</Label>
                                  <p>{device.model}</p>
                                </div>
                              )}
                              {device.operating_system && (
                                <div>
                                  <Label className="text-xs text-gray-500">OS</Label>
                                  <p>{device.operating_system}</p>
                                </div>
                              )}
                              {device.cpu && (
                                <div>
                                  <Label className="text-xs text-gray-500">CPU</Label>
                                  <p>{device.cpu}</p>
                                </div>
                              )}
                              {device.ram && (
                                <div>
                                  <Label className="text-xs text-gray-500">RAM</Label>
                                  <p>{device.ram} GB</p>
                                </div>
                              )}
                              {device.storage_capacity && (
                                <div>
                                  <Label className="text-xs text-gray-500">Storage</Label>
                                  <p>{device.storage_capacity} GB</p>
                                </div>
                              )}
                            </div>
                            {device.notes && (
                              <div>
                                <Label className="text-xs text-gray-500">Notes</Label>
                                <p className="text-sm text-gray-700 mt-1">{device.notes}</p>
                              </div>
                            )}
                            <div className="text-xs text-gray-400 pt-2 border-t">
                              Added: {device.created_at.toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Device Tab */}
          <TabsContent value="add-device">
            <Card>
              <CardHeader>
                <CardTitle>➕ Add New Device</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDevice} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="device-name">Device Name *</Label>
                      <Input
                        id="device-name"
                        value={deviceFormData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter device name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-type">Device Type *</Label>
                      <Select 
                        value={deviceFormData.type} 
                        onValueChange={(value: DeviceType) => 
                          setDeviceFormData((prev: CreateDeviceInput) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="device-ip">IP Address</Label>
                      <Input
                        id="device-ip"
                        value={deviceFormData.ip_address || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            ip_address: e.target.value || null 
                          }))
                        }
                        placeholder="192.168.1.100"
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-status">Status *</Label>
                      <Select 
                        value={deviceFormData.status} 
                        onValueChange={(value: DeviceStatus) => 
                          setDeviceFormData((prev: CreateDeviceInput) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="device-make">Make</Label>
                      <Input
                        id="device-make"
                        value={deviceFormData.make || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            make: e.target.value || null 
                          }))
                        }
                        placeholder="Dell, HP, Cisco, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-model">Model</Label>
                      <Input
                        id="device-model"
                        value={deviceFormData.model || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            model: e.target.value || null 
                          }))
                        }
                        placeholder="PowerEdge R720, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-os">Operating System</Label>
                      <Input
                        id="device-os"
                        value={deviceFormData.operating_system || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            operating_system: e.target.value || null 
                          }))
                        }
                        placeholder="Ubuntu 22.04, Windows Server 2022, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-cpu">CPU</Label>
                      <Input
                        id="device-cpu"
                        value={deviceFormData.cpu || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            cpu: e.target.value || null 
                          }))
                        }
                        placeholder="Intel Xeon E5-2670, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-ram">RAM (GB)</Label>
                      <Input
                        id="device-ram"
                        type="number"
                        value={deviceFormData.ram || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            ram: parseFloat(e.target.value) || null 
                          }))
                        }
                        placeholder="32"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="device-storage">Storage Capacity (GB)</Label>
                      <Input
                        id="device-storage"
                        type="number"
                        value={deviceFormData.storage_capacity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDeviceFormData((prev: CreateDeviceInput) => ({ 
                            ...prev, 
                            storage_capacity: parseFloat(e.target.value) || null 
                          }))
                        }
                        placeholder="1000"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="device-notes">Notes</Label>
                    <Textarea
                      id="device-notes"
                      value={deviceFormData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDeviceFormData((prev: CreateDeviceInput) => ({ 
                          ...prev, 
                          notes: e.target.value || null 
                        }))
                      }
                      placeholder="Additional notes about this device..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Creating Device...' : 'Create Device'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships">
            <Card>
              <CardHeader>
                <CardTitle>🔗 Device Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                {relationships.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🔗</div>
                    <p>No relationships defined yet. Add some relationships to visualize your network topology!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {relationships.map((relationship: DeviceRelationship) => (
                      <Card key={relationship.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="font-medium">{getDeviceName(relationship.parent_device_id)}</div>
                              <div className="text-xs text-gray-500">Parent Device</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-px bg-gray-300"></div>
                              <Badge variant="outline">
                                {relationshipTypes.find(rt => rt.value === relationship.relationship_type)?.label}
                              </Badge>
                              <div className="w-8 h-px bg-gray-300"></div>
                              <div className="text-gray-400">→</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{getDeviceName(relationship.child_device_id)}</div>
                              <div className="text-xs text-gray-500">Child Device</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            Created: {relationship.created_at.toLocaleDateString()}
                          </div>
                        </div>
                        {relationship.description && (
                          <>
                            <Separator className="my-3" />
                            <p className="text-sm text-gray-600">{relationship.description}</p>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Relationship Tab */}
          <TabsContent value="add-relationship">
            <Card>
              <CardHeader>
                <CardTitle>🔗 Add Device Relationship</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRelationship} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="parent-device">Parent Device *</Label>
                      <Select 
                        value={relationshipFormData.parent_device_id.toString()} 
                        onValueChange={(value: string) => 
                          setRelationshipFormData((prev: CreateDeviceRelationshipInput) => ({ 
                            ...prev, 
                            parent_device_id: parseInt(value) 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device: Device) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {getDeviceTypeIcon(device.type)} {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="child-device">Child Device *</Label>
                      <Select 
                        value={relationshipFormData.child_device_id.toString()} 
                        onValueChange={(value: string) => 
                          setRelationshipFormData((prev: CreateDeviceRelationshipInput) => ({ 
                            ...prev, 
                            child_device_id: parseInt(value) 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select child device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device: Device) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {getDeviceTypeIcon(device.type)} {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="relationship-type">Relationship Type *</Label>
                    <Select 
                      value={relationshipFormData.relationship_type} 
                      onValueChange={(value: RelationshipType) => 
                        setRelationshipFormData((prev: CreateDeviceRelationshipInput) => ({ 
                          ...prev, 
                          relationship_type: value 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="relationship-description">Description</Label>
                    <Textarea
                      id="relationship-description"
                      value={relationshipFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setRelationshipFormData((prev: CreateDeviceRelationshipInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      placeholder="Optional description of this relationship..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || devices.length < 2 || relationshipFormData.parent_device_id === 0 || relationshipFormData.child_device_id === 0}
                    className="w-full"
                  >
                    {isLoading ? 'Creating Relationship...' : 'Create Relationship'}
                  </Button>

                  {devices.length < 2 && (
                    <Alert>
                      <AlertDescription>
                        You need at least 2 devices to create relationships. Add more devices first!
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;