'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import Navigation from '@/components/layout/navigation';
import TransactionForm from '@/components/finance/transaction-form';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CurrencyDollarIcon,
  TagIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
  };
  date: string;
  processedDescription: string;
  confidence: number;
  needsReview: boolean;
  status: 'pending' | 'confirmed' | 'rejected';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  search: string;
  type: 'income' | 'expense' | '';
  categoryId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'rejected' | '';
  needsReview: boolean | null;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    status: '',
    needsReview: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters, sortBy, sortOrder, currentPage]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories?includeSystem=true', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.status && { status: filters.status }),
        ...(filters.needsReview !== null && { needsReview: filters.needsReview.toString() }),
      });

      const response = await fetch(`/api/transactions?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setPagination({
        total: data.total,
        hasMore: data.hasMore,
      });
    } catch (error) {
      console.error('Transactions error:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (formData: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      setShowForm(false);
      loadTransactions();
    } catch (error) {
      console.error('Create transaction error:', error);
      throw error;
    }
  };

  const handleUpdateTransaction = async (formData: any) => {
    if (!editingTransaction) return;

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transaction');
      }

      setEditingTransaction(null);
      loadTransactions();
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      loadTransactions();
    } catch (error) {
      console.error('Delete transaction error:', error);
      alert('Failed to delete transaction');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      status: '',
      needsReview: null,
    });
    setCurrentPage(0);
  };

  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== '' && value !== null && value !== undefined
  ).length;

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="lg:pl-64">
          <div className="p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="lg:pl-64">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {pagination.total} transaction{pagination.total !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search transactions..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Filters */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {activeFiltersCount}
                      </span>
                    )}
                    <ChevronDownIcon className="h-4 w-4 ml-2" />
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="p-4 space-y-4">
                        {/* Type Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All Types</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                          </select>
                        </div>

                        {/* Category Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={filters.categoryId}
                            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={filters.startDate}
                              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={filters.endDate}
                              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        {/* Needs Review Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Review Status</label>
                          <select
                            value={filters.needsReview === null ? '' : filters.needsReview.toString()}
                            onChange={(e) => setFilters({
                              ...filters,
                              needsReview: e.target.value === '' ? null : e.target.value === 'true'
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All</option>
                            <option value="true">Needs Review</option>
                            <option value="false">Reviewed</option>
                          </select>
                        </div>

                        {/* Clear Filters */}
                        <button
                          onClick={clearFilters}
                          className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                  <option value="description-asc">Description A-Z</option>
                </select>

                {/* Add Transaction Button */}
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow text-center py-12">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeFiltersCount > 0
                  ? 'Try adjusting your filters or search criteria.'
                  : 'Get started by adding your first transaction.'
                }
              </p>
              {activeFiltersCount === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {transaction.description}
                            </div>
                            {transaction.processedDescription !== transaction.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                AI: {transaction.processedDescription}
                              </div>
                            )}
                          </div>
                          {transaction.needsReview && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              Needs Review
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: transaction.category.color }}
                            />
                            <span className="text-sm text-gray-900">{transaction.category.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                          {transaction.confidence < 100 && (
                            <div className="text-xs text-gray-500">
                              {transaction.confidence}% confidence
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setViewingTransaction(transaction)}
                              className="text-gray-400 hover:text-gray-600"
                              title="View details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingTransaction(transaction)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Edit transaction"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-400 hover:text-red-600"
                              title="Delete transaction"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {currentPage * pageSize + 1} to{' '}
                    {Math.min((currentPage + 1) * pageSize, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage + 1} of {Math.ceil(pagination.total / pageSize)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasMore}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Form Modal */}
      {(showForm || editingTransaction) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                  </h3>
                </div>

                <TransactionForm
                  initialData={editingTransaction ? {
                    description: editingTransaction.description,
                    amount: (editingTransaction.amount / 100).toString(),
                    type: editingTransaction.type,
                    categoryId: editingTransaction.categoryId,
                    date: new Date(editingTransaction.date).toISOString().split('T')[0],
                  } : undefined}
                  onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingTransaction(null);
                  }}
                  isLoading={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setViewingTransaction(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTransaction.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <p className={`mt-1 text-sm font-medium ${
                        viewingTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {viewingTransaction.type === 'income' ? '+' : '-'}{formatCurrency(viewingTransaction.amount)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{viewingTransaction.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="mt-1 text-sm text-gray-900">{viewingTransaction.category.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(viewingTransaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewingTransaction.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : viewingTransaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {viewingTransaction.status}
                    </span>
                  </div>

                  {viewingTransaction.processedDescription !== viewingTransaction.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">AI Processed Description</label>
                      <p className="mt-1 text-sm text-gray-900">{viewingTransaction.processedDescription}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confidence</label>
                    <div className="mt-1">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${viewingTransaction.confidence}%`,
                              backgroundColor: viewingTransaction.confidence > 80 ? '#10B981' :
                                             viewingTransaction.confidence > 60 ? '#F59E0B' : '#EF4444'
                            }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-900">{viewingTransaction.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(viewingTransaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setViewingTransaction(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}