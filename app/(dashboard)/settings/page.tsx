'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import Navigation from '@/components/layout/navigation';
import {
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  BellIcon,
  EyeIcon,
  CogIcon,
  ShieldCheckIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface UserSettings {
  name: string;
  email: string;
  businessName?: string;
  baseCurrency: string;
  timezone: string;
  preferences: {
    defaultCategories: string[];
    notificationSettings: {
      email: boolean;
      push: boolean;
      weeklyReport: boolean;
      monthlyReport: boolean;
      insightAlerts: boolean;
      budgetAlerts: boolean;
    };
    dashboardLayout: {
      showCharts: boolean;
      showTable: boolean;
      defaultPeriod: string;
    };
    aiAssistanceEnabled: boolean;
    autoCategorization: boolean;
    dataRetention: number; // months
  };
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setSettings({
        name: user.name,
        email: user.email,
        businessName: user.businessName || '',
        baseCurrency: user.baseCurrency || 'USD',
        timezone: user.timezone || 'UTC',
        preferences: {
          defaultCategories: user.preferences?.defaultCategories || [],
          notificationSettings: {
            email: user.preferences?.notificationSettings?.email ?? true,
            push: user.preferences?.notificationSettings?.push ?? false,
            weeklyReport: false,
            monthlyReport: true,
            insightAlerts: true,
            budgetAlerts: true,
          },
          dashboardLayout: {
            showCharts: user.preferences?.dashboardLayout?.showCharts ?? true,
            showTable: user.preferences?.dashboardLayout?.showTable ?? true,
            defaultPeriod: '30d',
          },
          aiAssistanceEnabled: user.preferences?.aiAssistanceEnabled ?? true,
          autoCategorization: true,
          dataRetention: 36, // 3 years default
        },
      });
    }
    setLoading(false);
  }, [user]);

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Save settings error:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format: string) => {
    try {
      const response = await fetch('/api/export/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format,
          options: { includeMetadata: true },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business_finance_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
      return;
    }

    if (!confirm('WARNING: This will permanently delete all your transactions, categories, insights, and account data. Are you absolutely sure?')) {
      return;
    }

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      logout();
    } catch (error) {
      console.error('Delete account error:', error);
      setError('Failed to delete account');
    }
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
  ];

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'business', name: 'Business', icon: BuildingOfficeIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon },
    { id: 'data', name: 'Data & Privacy', icon: ShieldCheckIcon },
  ];

  if (loading) {
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

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="lg:pl-64">
          <div className="p-8">
            <div className="text-center">
              <p className="text-gray-500">Unable to load settings</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account and application preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-600">{success}</div>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={settings.email}
                        disabled
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Contact support to change email address</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Regional Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Base Currency</label>
                      <select
                        value={settings.baseCurrency}
                        onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {timezones.map((timezone) => (
                          <option key={timezone} value={timezone}>
                            {timezone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Business Tab */}
            {activeTab === 'business' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={settings.businessName}
                      onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                      placeholder="Enter your business name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Optional: Helps with business-specific insights and categorization</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Default Categories</h2>
                  <p className="text-sm text-gray-600 mb-4">Select categories that appear frequently in your transactions</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'Office Supplies',
                      'Software & Subscriptions',
                      'Marketing & Advertising',
                      'Travel & Meals',
                      'Utilities',
                      'Insurance',
                      'Professional Services',
                      'Equipment',
                      'Bank Fees',
                    ].map((category) => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.preferences.defaultCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettings({
                                ...settings,
                                preferences: {
                                  ...settings.preferences,
                                  defaultCategories: [...settings.preferences.defaultCategories, category]
                                }
                              });
                            } else {
                              setSettings({
                                ...settings,
                                preferences: {
                                  ...settings.preferences,
                                  defaultCategories: settings.preferences.defaultCategories.filter(c => c !== category)
                                }
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                            <p className="text-xs text-gray-500">Receive updates via email</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              email: !settings.preferences.notificationSettings.email
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.email ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.email ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                            <p className="text-xs text-gray-500">Receive in-app notifications</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              push: !settings.preferences.notificationSettings.push
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.push ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.push ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Report Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Weekly Summary</p>
                        <p className="text-xs text-gray-500">Get weekly financial summaries</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              weeklyReport: !settings.preferences.notificationSettings.weeklyReport
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.weeklyReport ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.weeklyReport ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Monthly Report</p>
                        <p className="text-xs text-gray-500">Comprehensive monthly financial report</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              monthlyReport: !settings.preferences.notificationSettings.monthlyReport
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.monthlyReport ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.monthlyReport ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Alert Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Insight Alerts</p>
                        <p className="text-xs text-gray-500">Get notified about new AI insights</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              insightAlerts: !settings.preferences.notificationSettings.insightAlerts
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.insightAlerts ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.insightAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Budget Alerts</p>
                        <p className="text-xs text-gray-500">Alert when spending exceeds budget limits</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            notificationSettings: {
                              ...settings.preferences.notificationSettings,
                              budgetAlerts: !settings.preferences.notificationSettings.budgetAlerts
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.notificationSettings.budgetAlerts ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.notificationSettings.budgetAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Dashboard Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <EyeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Show Charts</p>
                            <p className="text-xs text-gray-500">Display charts on dashboard</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            dashboardLayout: {
                              ...settings.preferences.dashboardLayout,
                              showCharts: !settings.preferences.dashboardLayout.showCharts
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.dashboardLayout.showCharts ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.dashboardLayout.showCharts ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Show Transaction Table</p>
                            <p className="text-xs text-gray-500">Display detailed transaction table</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            dashboardLayout: {
                              ...settings.preferences.dashboardLayout,
                              showTable: !settings.preferences.dashboardLayout.showTable
                            }
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.preferences.dashboardLayout.showTable ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.preferences.dashboardLayout.showTable ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Dashboard Period</label>
                      <select
                        value={settings.preferences.dashboardLayout.defaultPeriod}
                        onChange={(e) => setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            dashboardLayout: {
                              ...settings.preferences.dashboardLayout,
                              defaultPeriod: e.target.value
                            }
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">AI Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <CogIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">AI Assistance</p>
                            <p className="text-xs text-gray-500">Enable AI-powered features</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, aiAssistanceEnabled: !settings.aiAssistanceEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.aiAssistanceEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.aiAssistanceEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Auto Categorization</p>
                            <p className="text-xs text-gray-500">Automatically categorize transactions</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, autoCategorization: !settings.autoCategorization })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.autoCategorization ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.autoCategorization ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Data Management</h2>

                  {/* Data Retention */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention Period</label>
                    <select
                      value={settings.dataRetention}
                      onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={12}>1 year</option>
                      <option value={24}>2 years</option>
                      <option value={36}>3 years</option>
                      <option value={60}>5 years</option>
                      <option value={120}>10 years</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Data older than this period will be automatically deleted for privacy and compliance.
                    </p>
                  </div>

                  {/* Export Options */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Export Your Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => exportData('csv')}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Export as CSV
                      </button>
                      <button
                        onClick={() => exportData('json')}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                        Export as JSON
                      </button>
                      <button
                        onClick={() => exportData('xlsx')}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Export as Excel
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Danger Zone</h2>

                  {/* Delete Account */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                        <p className="text-xs text-red-700 mt-1">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={deleteAccount}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}