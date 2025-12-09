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
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { useLanguage } from "@/hooks/useLanguage";
import { incomeSchema } from "@/lib/validation";
import { logError, getUserFriendlyErrorMessage } from "@/lib/errorLogger";

const addIncomeFormSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required").max(100, "Description must be less than 100 characters"),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  date: z.string().min(1, "Date is required")
});
type AddIncomeForm = z.infer<typeof addIncomeFormSchema>;
interface AddIncomeDialogProps {
  onIncomeAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}
export default function AddIncomeDialog({
  onIncomeAdded,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true
}: AddIncomeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { getIncomeCategories, addCustomCategory } = useCategories();
  const { checkAndNotify } = useAccountStatus();
  const incomeCategories = getIncomeCategories();
  const form = useForm<AddIncomeForm>({
    resolver: zodResolver(addIncomeFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      category: "",
      customCategory: "",
      date: new Date().toISOString().split('T')[0]
    }
  });
  const onSubmit = async (data: AddIncomeForm) => {
    if (!checkAndNotify()) {
      return;
    }
    
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to add income.",
          variant: "destructive"
        });
        return;
      }
      let finalCategory = data.category;

      // If custom category is selected, add it to the database first
      if (data.category === "custom" && data.customCategory) {
        const success = await addCustomCategory(data.customCategory.toLowerCase().replace(/\s+/g, '-'), data.customCategory, 'income');
        if (success) {
          finalCategory = data.customCategory.toLowerCase().replace(/\s+/g, '-');
        } else {
          setLoading(false);
          return;
        }
      }
      // Validate with comprehensive schema
      const validatedData = incomeSchema.parse({
        amount: Number(data.amount),
        description: data.description.trim(),
        category: finalCategory,
        date: data.date
      });

      const {
        error
      } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        ...validatedData
      });
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: "Your income has been successfully recorded."
      });
      form.reset();
      setOpen(false);
      onIncomeAdded?.();
    } catch (error: any) {
      logError(error, 'AddIncomeDialog.onSubmit');
      
      // Handle validation errors specifically
      if (error?.name === 'ZodError') {
        const firstError = error.errors?.[0];
        toast({
          title: "Validation Error",
          description: firstError?.message || "Please check your input.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: getUserFriendlyErrorMessage(error),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && <DialogTrigger asChild>
          
        </DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('dialog.addNewIncome')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('form.amount')} ($)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="description" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly stipend, Book refund..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="category" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('form.category')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border shadow-md z-50">
                      {incomeCategories.map(category => <SelectItem key={category.value} value={category.value}>
                          {category.label} {category.isCustom && `(${t('common.custom')})`}
                        </SelectItem>)}
                      <SelectItem value="custom">{t('form.addCustomCategory')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />

            {form.watch("category") === "custom" && <FormField control={form.control} name="customCategory" render={({
            field
          }) => <FormItem>
                    <FormLabel>{t('form.customCategoryName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('form.enterCategoryName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />}

            <FormField control={form.control} name="date" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('form.date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-success to-success/80">
                {loading ? t('common.adding') : t('income.addIncome')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}