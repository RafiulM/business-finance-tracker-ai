'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  TagIcon,
  PlusIcon,
  XIcon,
  SearchIcon
} from '@heroicons/react/outline';
import { useAuth } from '@/components/auth/auth-provider';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  description?: string;
}

interface CategorySelectorProps {
  value?: string;
  onChange: (categoryId: string) => void;
  type?: 'income' | 'expense';
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  onCreateNew?: (categoryData: {
    name: string;
    type: 'income' | 'expense';
    description?: string;
    color?: string;
  }) => Promise<void>;
}

export default function CategorySelector({
  value,
  onChange,
  type,
  placeholder = 'Select a category',
  disabled = false,
  allowCreate = false,
  onCreateNew
}: CategorySelectorProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6', // Default blue color
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load categories when component mounts or type changes
  useEffect(() => {
    loadCategories();
  }, [type]);

  // Filter categories based on search query
  useEffect(() => {
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeSystem: 'true',
        ...(type && { type }),
      });

      const response = await fetch(`/api/categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setFilteredCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = async () => {
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    if (!type) {
      setError('Transaction type is required for creating categories');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (onCreateNew) {
        await onCreateNew({
          name: newCategory.name.trim(),
          type,
          description: newCategory.description.trim() || undefined,
          color: newCategory.color,
        });
      } else {
        // Default create logic
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCategory.name.trim(),
            type,
            description: newCategory.description.trim() || undefined,
            color: newCategory.color,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create category');
        }
      }

      // Reload categories
      await loadCategories();

      // Reset form
      setNewCategory({ name: '', description: '', color: '#3B82F6' });
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      setError(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === value);

  const colorOptions = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#6B7280', // gray
    '#059669', // teal
  ];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`relative w-full pl-10 pr-10 py-2 text-left border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 cursor-pointer'
        }`}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <TagIcon className="h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-center">
          {selectedCategory ? (
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedCategory.color }}
              />
              <span className="truncate">{selectedCategory.name}</span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery ? 'No categories found' : 'No categories available'}
              </div>
            ) : (
              <div className="py-1">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectCategory(category.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center space-x-3 ${
                      selectedCategory?.id === category.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-gray-500 text-xs truncate">
                          {category.description}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      category.type === 'income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create New Category */}
          {allowCreate && (
            <div className="border-t border-gray-200 p-3">
              {!showCreateForm ? (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create New Category</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Category name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={2}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex space-x-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newCategory.color === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600">{error}</div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      disabled={loading || !newCategory.name.trim()}
                      className="flex-1 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCategory({ name: '', description: '', color: '#3B82F6' });
                        setError('');
                      }}
                      className="flex-1 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsOpen(false);
            setShowCreateForm(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}