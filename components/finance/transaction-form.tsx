'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, CurrencyDollarIcon, TagIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/auth-provider';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface TransactionFormProps {
  initialData?: {
    description?: string;
    amount?: string;
    type?: 'income' | 'expense';
    categoryId?: string;
    date?: string;
  };
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface TransactionFormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: string;
  date: string;
  notes?: string;
}

interface AIPrediction {
  category: Category;
  confidence: number;
  processedDescription: string;
  metadata: {
    vendor?: string;
    location?: string;
    tags: string[];
  };
}

export default function TransactionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: TransactionFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TransactionFormData>({
    description: initialData?.description || '',
    amount: initialData?.amount || '',
    type: initialData?.type || 'expense',
    categoryId: initialData?.categoryId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load categories when component mounts
  useEffect(() => {
    loadCategories();
  }, [formData.type]);

  // Auto-analyze transaction when description and amount are entered
  useEffect(() => {
    if (formData.description && formData.amount && !aiPrediction) {
      const timer = setTimeout(() => {
        analyzeWithAI();
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(timer);
    }
  }, [formData.description, formData.amount, formData.type]);

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/categories?type=${formData.type}&includeSystem=true`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const analyzeWithAI = async () => {
    if (!formData.description || !formData.amount) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/process-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount) * 100, // Convert to cents
          type: formData.type,
          currency: 'USD',
          date: formData.date,
        }),
      });

      if (response.ok) {
        const aiData = await response.json();

        // Find matching category
        const matchedCategory = categories.find(cat => cat.name === aiData.category.name);

        if (matchedCategory) {
          setAiPrediction({
            category: matchedCategory,
            confidence: aiData.confidence,
            processedDescription: aiData.processedDescription,
            metadata: aiData.extractedMetadata,
          });

          // Auto-select category if confidence is high
          if (aiData.confidence > 85) {
            setFormData(prev => ({
              ...prev,
              categoryId: matchedCategory.id,
              description: aiData.processedDescription || prev.description,
            }));
            setShowAISuggestion(false);
          } else {
            setShowAISuggestion(true);
          }
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  };

  const applyAISuggestion = () => {
    if (aiPrediction) {
      setFormData(prev => ({
        ...prev,
        categoryId: aiPrediction.category.id,
        description: aiPrediction.processedDescription || prev.description,
      }));
      setShowAISuggestion(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Analysis Status */}
      {isAnalyzing && (
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
          <LightBulbIcon className="h-5 w-5 text-blue-600 animate-pulse" />
          <span className="text-sm text-blue-700">AI is analyzing your transaction...</span>
        </div>
      )}

      {/* AI Suggestion */}
      {showAISuggestion && aiPrediction && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <LightBulbIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">AI Suggestion</h4>
              <p className="text-sm text-yellow-700 mt-1">
                I think this is a <strong>{aiPrediction.category.name}</strong> transaction
                {aiPrediction.metadata.vendor && ` from ${aiPrediction.metadata.vendor}`}
                with {aiPrediction.confidence}% confidence.
              </p>
              {aiPrediction.processedDescription !== formData.description && (
                <p className="text-sm text-yellow-700 mt-1">
                  Suggested description: "{aiPrediction.processedDescription}"
                </p>
              )}
              <div className="mt-3 space-x-2">
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="inline-flex items-center px-3 py-1 border border-yellow-300 shadow-sm text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Apply Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setShowAISuggestion(false)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-700 hover:text-yellow-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              formData.type === 'expense'
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              formData.type === 'income'
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <input
          type="text"
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g., Coffee at Starbucks, Monthly software subscription"
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.amount ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <TagIcon className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.categoryId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
            className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.date ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Notes (Optional) */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Add any additional notes about this transaction..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Transaction'
          )}
        </button>
      </div>
    </form>
  );
}