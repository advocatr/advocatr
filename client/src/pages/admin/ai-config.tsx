import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIModel {
  id: number;
  name: string;
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AIModelFormData {
  name: string;
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  isActive: boolean;
  isDefault: boolean;
}

const defaultSystemPrompt = `You are an expert legal advocacy coach analyzing a video submission of a student practicing oral advocacy. 

Analyze the following aspects:
1. Argument structure and legal reasoning
2. Voice projection and clarity
3. Pace and delivery
4. Use of authorities and precedents
5. Response to questions (if applicable)
6. Overall persuasiveness

Provide constructive feedback that is:
- Specific and actionable
- Encouraging but honest
- Focused on improvement areas
- Acknowledging strengths

Rate the performance on a scale of 1-5 and provide a confidence score (1-100) for your analysis.

Format your response as constructive feedback suitable for a law student.`;

export default function AIConfigPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState<AIModelFormData>({
    name: "",
    provider: "openai",
    apiKey: "",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: defaultSystemPrompt,
    isActive: true,
    isDefault: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['/api/admin/ai-models'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-models');
      if (!response.ok) {
        throw new Error('Failed to fetch AI models');
      }
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: AIModelFormData) => {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create AI model');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-models'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "AI model created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create AI model", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AIModelFormData }) => {
      const response = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update AI model');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-models'] });
      setEditingModel(null);
      resetForm();
      toast({ title: "AI model updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update AI model", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete AI model');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-models'] });
      toast({ title: "AI model deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete AI model", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/ai-models/${id}/test`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to test AI model');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "AI model test successful", 
        description: `Response received: ${data.response?.substring(0, 100)}...`
      });
    },
    onError: (error) => {
      toast({ 
        title: "AI model test failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "openai",
      apiKey: "",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: defaultSystemPrompt,
      isActive: true,
      isDefault: false,
    });
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      apiKey: model.apiKey,
      endpoint: model.endpoint,
      model: model.model,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      systemPrompt: model.systemPrompt,
      isActive: model.isActive,
      isDefault: model.isDefault,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingModel) {
      // If API key is empty during edit, don't update it
      const updateData = { ...formData };
      if (!formData.apiKey.trim()) {
        delete updateData.apiKey;
      }
      updateMutation.mutate({ id: editingModel.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this AI model configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = (id: number) => {
    testMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading AI configurations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-gray-600">Manage AI models and parameters for video analysis</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingModel(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add AI Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New AI Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., GPT-4 Advocacy Analyzer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="azure">Azure OpenAI</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., gpt-4, claude-3-opus"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endpoint">API Endpoint</Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature ({formData.temperature})</Label>
                  <Input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                    min="100"
                    max="4000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={8}
                  required
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label htmlFor="isDefault">Default Model</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Model"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {models.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No AI models configured yet.</p>
              <p className="text-sm text-gray-400 mt-2">Add your first AI model to enable video analysis.</p>
            </CardContent>
          </Card>
        ) : (
          models.map((model: AIModel) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {model.name}
                      {model.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                      {!model.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {model.provider} - {model.model}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTest(model.id)}
                      disabled={testMutation.isPending}
                    >
                      Test
                    </Button>
                    <Dialog open={editingModel?.id === model.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingModel(null);
                        resetForm();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit AI Model</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          {/* Same form fields as create dialog */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Model Name</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-provider">Provider</Label>
                              <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai">OpenAI</SelectItem>
                                  <SelectItem value="anthropic">Anthropic</SelectItem>
                                  <SelectItem value="google">Google</SelectItem>
                                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-model">Model</Label>
                              <Input
                                id="edit-model"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-endpoint">API Endpoint</Label>
                              <Input
                                id="edit-endpoint"
                                value={formData.endpoint}
                                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-apiKey">API Key</Label>
                            <Input
                              id="edit-apiKey"
                              type="password"
                              value={formData.apiKey}
                              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                              placeholder="Leave empty to keep existing key"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-temperature">Temperature ({formData.temperature})</Label>
                              <Input
                                id="edit-temperature"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={formData.temperature}
                                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-maxTokens">Max Tokens</Label>
                              <Input
                                id="edit-maxTokens"
                                type="number"
                                value={formData.maxTokens}
                                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                                min="100"
                                max="4000"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-systemPrompt">System Prompt</Label>
                            <Textarea
                              id="edit-systemPrompt"
                              value={formData.systemPrompt}
                              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                              rows={8}
                              required
                            />
                          </div>

                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="edit-isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                              />
                              <Label htmlFor="edit-isActive">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="edit-isDefault"
                                checked={formData.isDefault}
                                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                              />
                              <Label htmlFor="edit-isDefault">Default Model</Label>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => {
                              setEditingModel(null);
                              resetForm();
                            }}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? "Updating..." : "Update Model"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(model.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Endpoint:</strong> {model.endpoint}</p>
                  <p><strong>Temperature:</strong> {model.temperature}</p>
                  <p><strong>Max Tokens:</strong> {model.maxTokens}</p>
                  <p><strong>Status:</strong> {model.isActive ? 'Active' : 'Inactive'}</p>
                  <p><strong>Created:</strong> {new Date(model.createdAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}