
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Key, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  videoUrl?: string;
  user: {
    username: string;
    email: string;
  };
  exercise: {
    title: string;
  };
}

interface UserProgress {
  userId: number;
  username: string;
  email: string;
  exercises: {
    progressId: number;
    exerciseId: number;
    exerciseTitle: string;
    completed: boolean;
    updatedAt: string;
    videoUrl?: string;
  }[];
  completedCount: number;
  totalExercises: number;
}

export default function AdminProgress() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  const { data: progress, refetch } = useQuery({
    queryKey: ["/api/admin/progress"],
    queryFn: async () => {
      const response = await fetch("/api/admin/progress");
      if (!response.ok) throw new Error("Failed to fetch progress data");
      return response.json();
    },
  });

  // Group progress by user
  const groupedProgress: UserProgress[] = progress ? 
    Object.values(
      progress.reduce((acc: { [key: number]: UserProgress }, p: Progress) => {
        if (!acc[p.userId]) {
          acc[p.userId] = {
            userId: p.userId,
            username: p.user.username,
            email: p.user.email,
            exercises: [],
            completedCount: 0,
            totalExercises: 0,
          };
        }
        
        acc[p.userId].exercises.push({
          progressId: p.id,
          exerciseId: p.exerciseId,
          exerciseTitle: p.exercise.title,
          completed: p.completed,
          updatedAt: p.updatedAt,
          videoUrl: p.videoUrl,
        });
        
        if (p.completed) {
          acc[p.userId].completedCount++;
        }
        acc[p.userId].totalExercises++;
        
        return acc;
      }, {})
    ).sort((a, b) => a.username.localeCompare(b.username))
    : [];

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

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
          <CardTitle>Progress Overview ({groupedProgress.length} Users)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedProgress.map((userProgress) => (
              <Collapsible key={userProgress.userId}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => toggleUserExpansion(userProgress.userId)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {expandedUsers.has(userProgress.userId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <p className="font-medium">{userProgress.username}</p>
                          <p className="text-sm text-gray-500">{userProgress.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {userProgress.completedCount}/{userProgress.totalExercises} Completed
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((userProgress.completedCount / userProgress.totalExercises) * 100)}% Complete
                          </div>
                        </div>
                        <Dialog
                          open={selectedUserId === userProgress.userId}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserId(userProgress.userId);
                              }}
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
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercise</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userProgress.exercises.map((exercise) => (
                            <TableRow key={exercise.progressId}>
                              <TableCell>{exercise.exerciseTitle}</TableCell>
                              <TableCell>
                                {exercise.completed ? (
                                  <span className="text-green-600 font-medium">Completed</span>
                                ) : (
                                  <span className="text-yellow-600 font-medium">In Progress</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(exercise.updatedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetMutation.mutate(exercise.progressId)}
                                    disabled={resetMutation.isPending}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reset
                                  </Button>
                                  {exercise.videoUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => triggerAiAnalysis(exercise.progressId)}
                                      className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    >
                                      🤖 AI Analysis
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
