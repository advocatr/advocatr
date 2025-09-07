import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const exerciseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  demoVideoUrl: z.string().url("Must be a valid URL"),
  professionalAnswerUrl: z.string().url("Must be a valid URL"),
  pdfUrl: z.string().url("Must be a valid URL").optional(),
  order: z.number().min(1, "Order must be at least 1"),
  videoRecordingTimeLimit: z.number().min(30, "Minimum 30 seconds").max(1800, "Maximum 30 minutes"),
  switchPoints: z.array(z.object({
    timeInSeconds: z.number().min(0, "Time must be non-negative"),
    nextVideoUrl: z.string().url("Must be a valid URL"),
  })).optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

export default function AdminExercises() {
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<any>(null);

  const { data: exercises, refetch } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: async () => {
      const response = await fetch("/api/exercises");
      if (!response.ok) throw new Error("Failed to fetch exercises");
      return response.json();
    },
  });

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      title: "",
      description: "",
      demoVideoUrl: "",
      professionalAnswerUrl: "",
      pdfUrl: "",
      order: 1,
      videoRecordingTimeLimit: 300, // Default 5 minutes
      switchPoints: [],
    },
  });

  // Reset form when editing state changes
  useEffect(() => {
    if (isEditing && currentExercise) {
      form.reset({
        title: currentExercise.title,
        description: currentExercise.description,
        demoVideoUrl: currentExercise.demoVideoUrl,
        professionalAnswerUrl: currentExercise.professionalAnswerUrl,
        pdfUrl: currentExercise.pdfUrl || "",
        order: currentExercise.order,
        videoRecordingTimeLimit: currentExercise.videoRecordingTimeLimit || 300,
        switchPoints: currentExercise.switchPoints || [],
      });
    } else if (!isEditing) {
      form.reset({
        title: "",
        description: "",
        demoVideoUrl: "",
        professionalAnswerUrl: "",
        order: 1,
        videoRecordingTimeLimit: 300,
        switchPoints: [],
      });
    }
  }, [isEditing, currentExercise, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ExerciseFormData) => {
      const response = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create exercise");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Exercise created successfully" });
      refetch();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ExerciseFormData & { id: number }) => {
      const { id, ...exerciseData } = data;
      const response = await fetch(`/api/admin/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exerciseData),
      });
      if (!response.ok) throw new Error("Failed to update exercise");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Exercise updated successfully" });
      refetch();
      setIsEditing(false);
      setCurrentExercise(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/exercises/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete exercise");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Exercise deleted successfully" });
      refetch();
      setIsDeleteDialogOpen(false);
      setExerciseToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExerciseFormData) => {
    if (isEditing && currentExercise) {
      updateMutation.mutate({ ...data, id: currentExercise.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (exercise: any) => {
    setCurrentExercise(exercise);
    setIsEditing(true);
  };

  const handleDelete = (exercise: any) => {
    setExerciseToDelete(exercise);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (exerciseToDelete) {
      deleteMutation.mutate(exerciseToDelete.id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Exercises</h1>
        <Dialog 
        open={isEditing} 
        onOpenChange={(open) => {
          setIsEditing(open);
          if (!open) {
            setCurrentExercise(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setIsEditing(false);
              setCurrentExercise(null);
              // Don't call setIsEditing(false) here as DialogTrigger handles opening
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Exercise" : "Create New Exercise"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="demoVideoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demo Video URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="professionalAnswerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Answer Video URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="videoRecordingTimeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Recording Time Limit (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="30"
                          max="1800"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-500">
                        Maximum recording duration (30 seconds to 30 minutes)
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pdfUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PDF Materials URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://example.com/materials.pdf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Video Switching Points</h3>
                  {form.watch('switchPoints')?.map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`switchPoints.${index}.timeInSeconds`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Time (seconds)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`switchPoints.${index}.nextVideoUrl`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Next Video URL</FormLabel>
                            <FormControl>
                              <Input {...field} type="url" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          const points = form.getValues('switchPoints');
                          points.splice(index, 1);
                          form.setValue('switchPoints', points);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const points = form.getValues('switchPoints') || [];
                      form.setValue('switchPoints', [
                        ...points,
                        { timeInSeconds: 0, nextVideoUrl: '' }
                      ]);
                    }}
                  >
                    Add Switching Point
                  </Button>
                </div>
                <Button type="submit" className="w-full">
                  {isEditing ? "Update Exercise" : "Create Exercise"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {exercises?.map((exercise: any) => (
          <Card key={exercise.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>
                  {exercise.order}. {exercise.title}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleEdit(exercise)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDelete(exercise)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{exercise.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{exerciseToDelete?.title}"? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}