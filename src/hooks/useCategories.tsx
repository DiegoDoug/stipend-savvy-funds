import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface CustomCategory {
  id: string;
  name: string;
  label: string;
  type: 'income' | 'expense' | 'both';
}

// Predefined categories
const defaultExpenseCategories: Category[] = [
  { value: "essentials", label: "Essentials" },
  { value: "transportation", label: "Transportation" },
  { value: "entertainment", label: "Entertainment" },
  { value: "food", label: "Food & Dining" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health & Wellness" },
  { value: "shopping", label: "Shopping" },
  { value: "bills", label: "Bills & Utilities" },
  { value: "athletic", label: "Athletic/Health" },
  { value: "fun", label: "Wants/Fun" },
];

const defaultIncomeCategories: Category[] = [
  { value: "stipend", label: "Stipend" },
  { value: "scholarship", label: "Scholarship" },
  { value: "refund", label: "Refund" },
  { value: "side-gig", label: "Side Gig" },
  { value: "gift", label: "Gift/Family" },
  { value: "other", label: "Other" },
];

const defaultBudgetCategories: Category[] = [
  { value: "essentials", label: "Essentials" },
  { value: "savings", label: "Savings" },
  { value: "personal", label: "Personal" },
  { value: "extra", label: "Extra" },
  { value: "athletic", label: "Athletic/Health" },
  { value: "education", label: "Education" },
  { value: "fun", label: "Wants/Fun" },
  { value: "transportation", label: "Transportation" },
  { value: "entertainment", label: "Entertainment" },
  { value: "food", label: "Food & Dining" },
  { value: "health", label: "Health & Wellness" },
  { value: "shopping", label: "Shopping" },
  { value: "bills", label: "Bills & Utilities" },
];

export const useCategories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch custom categories from database
  const fetchCustomCategories = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCustomCategories((data || []) as CustomCategory[]);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
      toast({
        title: "Error",
        description: "Failed to load custom categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomCategories();
  }, [user]);

  // Add a new custom category
  const addCustomCategory = async (name: string, label: string, type: 'income' | 'expense' | 'both') => {
    if (!user) return false;

    // Normalize the category name
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');

    // Check if category already exists in default categories
    const allDefaults = [...defaultExpenseCategories, ...defaultIncomeCategories, ...defaultBudgetCategories];
    const existsInDefaults = allDefaults.some(cat => cat.value === normalizedName);
    
    if (existsInDefaults) {
      // Category already exists as a default - just return success (no need to create)
      return true;
    }

    // Check if category already exists in user's custom categories
    const existsInCustom = customCategories.some(cat => cat.name === normalizedName);
    
    if (existsInCustom) {
      // Category already exists as custom - just return success
      return true;
    }

    // Only try to insert if it's truly new
    try {
      const { error } = await supabase
        .from('custom_categories')
        .insert({
          user_id: user.id,
          name: normalizedName,
          label,
          type
        });

      if (error) throw error;

      await fetchCustomCategories();
      toast({
        title: "Success",
        description: `Custom category "${label}" added successfully`,
      });
      return true;
    } catch (error: any) {
      // Handle race condition - if insert fails due to duplicate, still return success
      if (error.code === '23505') {
        await fetchCustomCategories(); // Refresh to get the existing category
        return true; // Category exists, so return success
      }
      
      console.error('Error adding custom category:', error);
      toast({
        title: "Error",
        description: "Failed to add custom category",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get categories for expense dialogs
  const getExpenseCategories = (): Category[] => {
    const custom = customCategories
      .filter(cat => cat.type === 'expense' || cat.type === 'both')
      .map(cat => ({ value: cat.name, label: cat.label, isCustom: true }));
    
    return [...defaultExpenseCategories, ...custom];
  };

  // Get categories for income dialogs
  const getIncomeCategories = (): Category[] => {
    const custom = customCategories
      .filter(cat => cat.type === 'income' || cat.type === 'both')
      .map(cat => ({ value: cat.name, label: cat.label, isCustom: true }));
    
    return [...defaultIncomeCategories, ...custom];
  };

  // Get all categories (both income and expense)
  const getAllCategories = (): Category[] => {
    const custom = customCategories.map(cat => ({ 
      value: cat.name, 
      label: cat.label, 
      isCustom: true 
    }));
    
    // Combine and deduplicate categories
    const allDefaults = [...defaultExpenseCategories, ...defaultIncomeCategories, ...defaultBudgetCategories];
    const uniqueDefaults = allDefaults.filter((cat, index, self) => 
      index === self.findIndex(c => c.value === cat.value)
    );
    
    return [...uniqueDefaults, ...custom];
  };

  // Get categories for budget allocation
  const getBudgetCategories = (): Category[] => {
    const custom = customCategories
      .filter(cat => cat.type === 'expense' || cat.type === 'both')
      .map(cat => ({ value: cat.name, label: cat.label, isCustom: true }));
    
    return [...defaultBudgetCategories, ...custom];
  };

  return {
    loading,
    customCategories,
    addCustomCategory,
    getExpenseCategories,
    getIncomeCategories,
    getAllCategories,
    getBudgetCategories,
    refetch: fetchCustomCategories,
  };
};