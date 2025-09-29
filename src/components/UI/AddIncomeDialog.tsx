import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

const addIncomeSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required").max(100, "Description must be less than 100 characters"),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type AddIncomeForm = z.infer<typeof addIncomeSchema>;

interface AddIncomeDialogProps {
  onIncomeAdded?: () => void;
}

export default function AddIncomeDialog({ onIncomeAdded }: AddIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { getIncomeCategories, addCustomCategory } = useCategories();

  const incomeCategories = getIncomeCategories();

  const form = useForm<AddIncomeForm>({
    resolver: zodResolver(addIncomeSchema),
    defaultValues: {
      amount: "",
      description: "",
      category: "",
      customCategory: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: AddIncomeForm) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to add income.",
          variant: "destructive",
        });
        return;
      }

      let finalCategory = data.category;
      
      // If custom category is selected, add it to the database first
      if (data.category === "custom" && data.customCategory) {
        const success = await addCustomCategory(
          data.customCategory.toLowerCase().replace(/\s+/g, '-'),
          data.customCategory,
          'income'
        );
        if (success) {
          finalCategory = data.customCategory.toLowerCase().replace(/\s+/g, '-');
        } else {
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'income',
          amount: Number(data.amount),
          description: data.description,
          category: finalCategory,
          date: data.date,
        });

      if (error) throw error;

      toast({
        title: "Income Added",
        description: "Your income has been successfully recorded.",
      });

      form.reset();
      setOpen(false);
      onIncomeAdded?.();
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Error",
        description: "Failed to add income. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-success to-success/80">
          <Plus size={18} className="mr-2" />
          Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Income</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="0.00" 
                      type="number" 
                      step="0.01"
                      min="0"
                      {...field} 
                    />
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
                    <Input placeholder="e.g., Monthly stipend, Book refund..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select income category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border shadow-md z-50">
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label} {category.isCustom && "(Custom)"}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Add Custom Category</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("category") === "custom" && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-success to-success/80">
                {loading ? "Adding..." : "Add Income"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}