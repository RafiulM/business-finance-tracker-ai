'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import Navigation from '@/components/layout/navigation';
import {
  LightBulbIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarIcon,
  ChartBarIcon,
  EyeIcon,
  EyeOffIcon
} from '@heroicons/react/24/outline';

interface Insight {
  id: string;
  type: 'spending_trend' | 'anomaly' | 'cash_flow' | 'recommendation' | 'budget_alert' | 'goal_progress' | 'tax_opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
  };
  timePeriod?: {
    startDate: string;
    endDate: string;
  };
  data: {
    metrics: Record<string, any>;
    trends?: Array<{ date: string; value: number }>;
    visualizations?: Record<string, any>;
  };
  recommendations: Array<{
    description: string;
    type: string;
    completed: boolean;
  }>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GenerationRequest {
  timePeriod: {
    startDate: string;
    endDate: string;
  };
  focusAreas: Array<string>;
}

export default function InsightsPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    type: '',
    impact: '',
    isRead: '' as '' | 'true' | 'false',
  });
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationRequest, setGenerationRequest] = useState<GenerationRequest>({
    timePeriod: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    focusAreas: ['spending_trends', 'anomalies', 'cash_flow', 'recommendations'],
  });

  useEffect(() => {
    loadInsights();
  }, [filter, showUnreadOnly]);

  const loadInsights = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '100',
        ...(filter.type && { type: filter.type }),
        ...(filter.impact && { impact: filter.impact }),
        ...(filter.isRead && { isRead: filter.isRead }),
        ...(showUnreadOnly && { isRead: 'false' }),
      });

      const response = await fetch(`/api/insights?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      console.error('Insights error:', error);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/ai/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(generationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      const data = await response.json();
      setShowGenerateModal(false);
      loadInsights(); // Reload insights to show newly generated ones
    } catch (error) {
      console.error('Generate insights error:', error);
      setError('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/read`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setInsights(insights.map(insight =>
          insight.id === insightId ? { ...insight, isRead: true } : insight
        ));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/insights/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setInsights(insights.map(insight => ({ ...insight, isRead: true })));
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const deleteInsight = async (insightId: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return;

    try {
      const response = await fetch(`/api/insights/${insightId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setInsights(insights.filter(insight => insight.id !== insightId));
      }
    } catch (error) {
      console.error('Delete insight error:', error);
      alert('Failed to delete insight');
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'spending_trend':
        return <TrendingUpIcon className="h-5 w-5" />;
      case 'anomaly':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'cash_flow':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'recommendation':
        return <LightBulbIcon className="h-5 w-5" />;
      default:
        return <LightBulbIcon className="h-5 w-5" />;
    }
  };

  const getInsightTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const unreadCount = insights.filter(insight => !insight.isRead).length;

  const focusAreaOptions = [
    { value: 'spending_trends', label: 'Spending Trends' },
    { value: 'anomalies', label: 'Anomalies' },
    { value: 'cash_flow', label: 'Cash Flow Analysis' },
    { value: 'recommendations', label: 'Recommendations' },
    { value: 'budget_alert', label: 'Budget Alerts' },
    { value: 'goal_progress', label: 'Goal Progress' },
    { value: 'tax_opportunity', label: 'Tax Opportunities' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <div className="lg:pl-64">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Financial Insights</h1>
                <p className="mt-1 text-sm text-gray-600">
                  AI-powered analysis and recommendations for your business
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Generate Insights Button */}
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <LightBulbIcon className="h-4 w-4 mr-2" />
                  Generate Insights
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-2">
                    <LightBulbIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Total Insights</p>
                    <p className="text-lg font-semibold text-gray-900">{insights.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2">
                    <EyeIcon className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Unread</p>
                    <p className="text-lg font-semibold text-gray-900">{unreadCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-100 rounded-md p-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">High Impact</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insights.filter(i => i.impact === 'high').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Avg Confidence</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insights.length > 0
                        ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Type Filter */}
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="spending_trend">Spending Trends</option>
                <option value="anomaly">Anomalies</option>
                <option value="cash_flow">Cash Flow</option>
                <option value="recommendation">Recommendations</option>
                <option value="budget_alert">Budget Alerts</option>
                <option value="goal_progress">Goal Progress</option>
                <option value="tax_opportunity">Tax Opportunities</option>
              </select>

              {/* Impact Filter */}
              <select
                value={filter.impact}
                onChange={(e) => setFilter({ ...filter, impact: e.target.value })}
                className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Impacts</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Read Status Filter */}
              <select
                value={filter.isRead}
                onChange={(e) => setFilter({ ...filter, isRead: e.target.value as any })}
                className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="false">Unread</option>
                <option value="true">Read</option>
              </select>

              {/* Unread Toggle */}
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  showUnreadOnly
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                {showUnreadOnly ? 'Unread Only' : 'All Insights'}
              </button>

              {/* Mark All as Read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Mark All as Read
                </button>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Insights List */}
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="bg-white rounded-lg shadow text-center py-12">
              <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No insights yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate insights to get personalized financial analysis and recommendations.
              </p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Generate Insights
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    !insight.isRead ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0 bg-gray-100 rounded-md p-2">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900">
                            {insight.title}
                            {!insight.isRead && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                New
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {getInsightTypeLabel(insight.type)}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getImpactColor(insight.impact)}`}>
                              {insight.impact} impact
                            </span>
                            <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                              {insight.confidence}% confidence
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 mb-4">{insight.description}</p>

                      {/* Category */}
                      {insight.category && (
                        <div className="mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <div
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: insight.category.color }}
                            />
                            {insight.category.name}
                          </span>
                        </div>
                      )}

                      {/* Metrics */}
                      {insight.data.metrics && Object.keys(insight.data.metrics).length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Key Metrics</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(insight.data.metrics).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {typeof value === 'number' && key.includes('amount')
                                    ? new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                      }).format(value / 100)
                                    : typeof value === 'number'
                                    ? value.toLocaleString()
                                    : value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions</h4>
                          <ul className="space-y-1">
                            {insight.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start space-x-2 text-sm">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                                  rec.completed ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                                <span className={rec.completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                                  {rec.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Time Period */}
                      {insight.timePeriod && (
                        <div className="text-xs text-gray-500 mb-4">
                          <ClockIcon className="inline h-3 w-3 mr-1" />
                          Analysis period: {new Date(insight.timePeriod.startDate).toLocaleDateString()} - {new Date(insight.timePeriod.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!insight.isRead && (
                        <button
                          onClick={() => markAsRead(insight.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          title="Mark as read"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteInsight(insight.id)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        title="Delete insight"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Insights Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowGenerateModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Generate New Insights</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    AI will analyze your transaction data and generate personalized insights.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Time Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="inline h-4 w-4 mr-1" />
                      Analysis Period
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={generationRequest.timePeriod.startDate}
                          onChange={(e) => setGenerationRequest({
                            ...generationRequest,
                            timePeriod: {
                              ...generationRequest.timePeriod,
                              startDate: e.target.value
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={generationRequest.timePeriod.endDate}
                          onChange={(e) => setGenerationRequest({
                            ...generationRequest,
                            timePeriod: {
                              ...generationRequest.timePeriod,
                              endDate: e.target.value
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Focus Areas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Focus Areas
                    </label>
                    <div className="space-y-2">
                      {focusAreaOptions.map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generationRequest.focusAreas.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGenerationRequest({
                                  ...generationRequest,
                                  focusAreas: [...generationRequest.focusAreas, option.value]
                                });
                              } else {
                                setGenerationRequest({
                                  ...generationRequest,
                                  focusAreas: generationRequest.focusAreas.filter(area => area !== option.value)
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateInsights}
                    disabled={generating || generationRequest.focusAreas.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <LightBulbIcon className="h-4 w-4 mr-2" />
                        Generate Insights
                      </>
                    )}
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