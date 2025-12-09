import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Receipt, 
  Store, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  Sparkles,
  Edit2,
  Check,
  X,
  ShoppingCart
} from "lucide-react";
import { AIReceiptData, ReceiptItem } from "@/hooks/useAIReceiptAnalysis";
import { useCategories } from "@/hooks/useCategories";
import { motion } from "framer-motion";

interface ReceiptAnalysisPreviewProps {
  data: AIReceiptData;
  onCreateExpense: (data: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export default function ReceiptAnalysisPreview({
  data,
  onCreateExpense,
  onCancel,
  isUploading = false
}: ReceiptAnalysisPreviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [vendor, setVendor] = useState(data.vendor || '');
  const [amount, setAmount] = useState(data.amount?.toString() || '');
  const [date, setDate] = useState(data.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(data.suggestedCategory);
  const [description, setDescription] = useState(data.suggestedDescription);

  const { getExpenseCategories } = useCategories();
  const categories = getExpenseCategories();

  const confidenceColor = data.confidence >= 0.8 
    ? 'text-success' 
    : data.confidence >= 0.5 
      ? 'text-warning' 
      : 'text-destructive';

  const handleCreateExpense = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    onCreateExpense({
      amount: parseFloat(amount),
      description: description || `Purchase at ${vendor}`,
      category: category,
      date: date
    });
  };

  const EditableField = ({ 
    field, 
    value, 
    onChange, 
    icon: Icon, 
    label,
    type = 'text'
  }: { 
    field: string; 
    value: string; 
    onChange: (v: string) => void; 
    icon: React.ElementType; 
    label: string;
    type?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {editingField === field ? (
          <div className="flex items-center gap-2">
            <Input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => setEditingField(null)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="font-medium truncate">{value || 'Not detected'}</p>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingField(field)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Receipt Analysis
            </CardTitle>
            <Badge variant="outline" className={confidenceColor}>
              {Math.round(data.confidence * 100)}% confident
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <EditableField
              field="vendor"
              value={vendor}
              onChange={setVendor}
              icon={Store}
              label="Vendor"
            />
            
            <EditableField
              field="amount"
              value={amount}
              onChange={setAmount}
              icon={DollarSign}
              label="Total Amount"
              type="number"
            />
            
            <EditableField
              field="date"
              value={date}
              onChange={setDate}
              icon={Calendar}
              label="Date"
              type="date"
            />
            
            <EditableField
              field="description"
              value={description}
              onChange={setDescription}
              icon={FileText}
              label="Description"
            />

            {/* Category Select */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Tag className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {data.items.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Line Items ({data.items.length})</p>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {data.items.map((item: ReceiptItem, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                      <span className="font-medium ml-2">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isUploading}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleCreateExpense} 
          className="flex-1"
          disabled={!amount || parseFloat(amount) <= 0 || isUploading}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Receipt className="w-4 h-4 mr-2" />
              Create Expense
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
