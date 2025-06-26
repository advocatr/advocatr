import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Key } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface Progress {
  id: number;
  userId: number;
  exerciseId: number;
  completed: boolean;
  updatedAt: string;
  user: {
    username: string;
    email: string;
  };
  exercise: {
    title: string;
  };
}

export default function AdminProgress() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: progress, refetch } = useQuery({
    queryKey: ["/api/admin/progress"],
    queryFn: async () => {
      const response = await fetch("/api/admin/progress");
      if (!response.ok) throw new Error("Failed to fetch progress data");
      return response.json();
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (progressId: number) => {
      const response = await fetch(`/api/admin/progress/${progressId}/reset`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reset progress");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Progress reset successfully" });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "/api/progress" ||
            (typeof key === "string" && key.startsWith("/api/progress/"))
          );
        },
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const aiAnalysisMutation = useMutation({
    mutationFn: async (progressId: number) => {
      const response = await fetch(`/api/ai-feedback/${progressId}`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to trigger AI analysis");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "AI Analysis Started", 
        description: "AI feedback will be generated shortly" 
      });
      // Refetch after a delay to show the pending status
      setTimeout(() => refetch(), 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const triggerAiAnalysis = (progressId: number) => {
    aiAnalysisMutation.mutate(progressId);
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!response.ok) throw new Error("Failed to reset password");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password reset successfully" });
      setSelectedUserId(null);
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && newPassword) {
      resetPasswordMutation.mutate({ userId: selectedUserId, password: newPassword });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Candidate Progress</h1>

      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Exercise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress?.map((p: Progress) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.user.username}</p>
                      <p className="text-sm text-gray-500">{p.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{p.exercise.title}</TableCell>
                  <TableCell>
                    {p.completed ? (
                      <span className="text-green-600">Completed</span>
                    ) : (
                      <span className="text-yellow-600">In Progress</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetMutation.mutate(p.id)}
                        disabled={resetMutation.isPending}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Progress
                      </Button>
                      {p.videoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerAiAnalysis(p.id)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          🤖 AI Analysis
                        </Button>
                      )}
                      <Dialog
                        open={selectedUserId === p.userId}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedUserId(null);
                            setNewPassword("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUserId(p.userId)}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset User Password</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-password">New Password</Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={resetPasswordMutation.isPending}
                            >
                              Reset Password
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}