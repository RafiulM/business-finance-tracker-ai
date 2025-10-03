'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import Navigation from '@/components/layout/navigation';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  LightBulbIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
    averageTransaction: number;
    currency: string;
    savingsRate: number;
  };
  trends: {
    incomeTrend: Array<{ date: string; amount: number }>;
    expenseTrend: Array<{ date: string; amount: number }>;
    netIncomeTrend: Array<{ date: string; amount: number }>;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    type: 'income' | 'expense';
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: {
      name: string;
      color: string;
    };
    date: string;
  }>;
  recentInsights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
  }>;
  performanceMetrics: {
    averageTransactionValue: number;
    largestTransaction: number;
    smallestTransaction: number;
    mostActiveDay: string;
    categoryDiversity: number;
  };
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadDashboardData(selectedPeriod);
  }, [selectedPeriod]);

  const loadDashboardData = async (period: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dashboard/overview?period=${period}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard data error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Convert cents to dollars
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const periods = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '1y', label: '1 year' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="lg:pl-64">
          <div className="p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="lg:pl-64">
          <div className="p-8">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load dashboard</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={() => loadDashboardData(selectedPeriod)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try again
              </button>
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
                <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {dashboardData.period.label} • {new Date(dashboardData.period.startDate).toLocaleDateString()} - {new Date(dashboardData.period.endDate).toLocaleDateString()}
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {periods.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Income */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatCurrency(dashboardData.summary.totalIncome)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatCurrency(dashboardData.summary.totalExpenses)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${
                  dashboardData.summary.netIncome >= 0 ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  <CurrencyDollarIcon className={`h-6 w-6 ${
                    dashboardData.summary.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Net Income</dt>
                    <dd className={`text-lg font-semibold ${
                      dashboardData.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(dashboardData.summary.netIncome)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Savings Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Savings Rate</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatPercentage(dashboardData.summary.savingsRate)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Transactions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-6">
                  {dashboardData.recentTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by adding your first transaction.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: transaction.category.color }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.category.name} • {new Date(transaction.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className={`text-sm font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Categories */}
              <div className="bg-white rounded-lg shadow mt-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Top Categories</h2>
                </div>
                <div className="p-6">
                  {dashboardData.categories.length === 0 ? (
                    <p className="text-sm text-gray-500">No categories with activity this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.categories.slice(0, 6).map((category) => (
                        <div key={category.categoryId} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {category.categoryName}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatPercentage(category.percentage)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(category.percentage, 100)}%`,
                                  backgroundColor: category.type === 'income' ? '#10B981' : '#EF4444'
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {category.transactionCount} transactions • {formatCurrency(category.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <LightBulbIcon className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-lg font-medium text-gray-900">AI Insights</h2>
                  </div>
                </div>
                <div className="p-6">
                  {dashboardData.recentInsights.length === 0 ? (
                    <div className="text-center py-8">
                      <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No insights yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Add more transactions to get personalized insights.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recentInsights.map((insight) => (
                        <div key={insight.id} className="border-l-4 border-yellow-400 pl-4">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {insight.title}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              insight.impact === 'high'
                                ? 'bg-red-100 text-red-800'
                                : insight.impact === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {insight.impact}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {insight.description}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Confidence: {insight.confidence}%</span>
                            <span>•</span>
                            <span>{insight.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg shadow mt-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Performance Metrics</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Transaction</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(dashboardData.performanceMetrics.averageTransactionValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Largest Transaction</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(dashboardData.performanceMetrics.largestTransaction)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Most Active Day</span>
                    <span className="text-sm font-medium text-gray-900">
                      {dashboardData.performanceMetrics.mostActiveDay || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Category Diversity</span>
                    <span className="text-sm font-medium text-gray-900">
                      {dashboardData.performanceMetrics.categoryDiversity} categories
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}