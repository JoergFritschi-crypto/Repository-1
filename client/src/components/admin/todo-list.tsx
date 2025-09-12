import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, ListTodo } from "lucide-react";

interface TodoTask {
  id: string;
  task: string;
  createdAt: string;
}

export function TodoList() {
  const [newTask, setNewTask] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Fetch all tasks
  const { data: tasks, isLoading } = useQuery<TodoTask[]>({
    queryKey: ["/api/admin/todo-tasks"],
  });

  // Create new task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: string) => {
      const response = await apiRequest("POST", "/api/admin/todo-tasks", { task });
      return response.json();
    },
    onSuccess: () => {
      setNewTask("");
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todo-tasks"] });
      toast({
        title: "Task Added",
        description: "New task has been added to the list",
      });
    },
    onError: (error) => {
      setIsAdding(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/todo-tasks/${taskId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todo-tasks"] });
      toast({
        title: "Task Completed",
        description: "Task has been removed from the list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    if (newTask.trim()) {
      setIsAdding(true);
      createTaskMutation.mutate(newTask);
    }
  };

  const handleTaskCheck = (taskId: string, checked: boolean) => {
    if (checked) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTask.trim() && !isAdding) {
      handleAddTask();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="w-5 h-5" />
          Admin To-Do List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAdding}
            className="flex-1"
            data-testid="input-new-task"
          />
          <Button
            onClick={handleAddTask}
            disabled={!newTask.trim() || isAdding}
            data-testid="button-add-task"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </>
            )}
          </Button>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors"
                data-testid={`task-item-${task.id}`}
              >
                <Checkbox
                  onCheckedChange={(checked) => handleTaskCheck(task.id, checked as boolean)}
                  disabled={deleteTaskMutation.isPending}
                  className="mt-0.5"
                  data-testid={`checkbox-task-${task.id}`}
                />
                <span className="flex-1 text-sm leading-relaxed">
                  {task.task}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No tasks yet. Add your first task above!</p>
            </div>
          )}
        </div>

        {/* Task counter */}
        {tasks && tasks.length > 0 && (
          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} remaining
          </div>
        )}
      </CardContent>
    </Card>
  );
}