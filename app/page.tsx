"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  DollarSign,
  Shield,
  Zap,
  MessageCircle,
  PieChart,
  Wallet,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButtons, HeroAuthButtons } from "@/components/auth-buttons";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="text-center py-12 sm:py-16 relative px-4">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <AuthButtons />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl shadow-lg">
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-blue-500 to-purple-600 bg-clip-text text-transparent font-parkinsans">
            AI Business Finance Tracker
          </h1>
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 mb-8">
          Transform your business finances with AI-powered insights. Track expenses, manage income,
          and monitor assets using natural language input and intelligent recommendations.
        </p>

        <HeroAuthButtons />
      </div>

      <main className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-8 max-w-6xl">
        {/* Key Features */}
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-5xl mb-2">💼</div>
          <div className="font-bold text-lg sm:text-xl mb-2">Smart Financial Management</div>
          <div className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Leverage the power of AI to simplify your business financial tracking and gain valuable insights.
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* AI Assistant */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border-emerald-200/50 dark:border-emerald-700/30">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-lg">AI Assistant</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Natural Language</strong> - Describe transactions in plain English</li>
              <li>• <strong>Smart Parsing</strong> - AI extracts amount, category, and details</li>
              <li>• <strong>Quick Entry</strong> - Log expenses and income in seconds</li>
              <li>• <strong>Asset Tracking</strong> - Register business assets naturally</li>
            </ul>
          </Card>

          {/* Financial Dashboard */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200/50 dark:border-blue-700/30">
            <div className="flex items-center gap-3 mb-3">
              <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg">Financial Dashboard</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Visual Charts</strong> - Income vs expenses, category breakdowns</li>
              <li>• <strong>Real-time Metrics</strong> - Cash flow, net worth, balances</li>
              <li>• <strong>Monthly Trends</strong> - Track performance over time</li>
              <li>• <strong>Recent Activity</strong> - Latest transactions at a glance</li>
            </ul>
          </Card>

          {/* AI Insights */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200/50 dark:border-purple-700/30">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-lg">AI Insights</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Smart Analysis</strong> - AI analyzes your spending patterns</li>
              <li>• <strong>Actionable Tips</strong> - Personalized recommendations</li>
              <li>• <strong>Trend Detection</strong> - Identify opportunities and risks</li>
              <li>• <strong>Financial Health</strong> - AI-powered business insights</li>
            </ul>
          </Card>

          {/* Account Management */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200/50 dark:border-green-700/30">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-lg">Account Management</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Multiple Accounts</strong> - Bank, credit cards, cash</li>
              <li>• <strong>Balance Tracking</strong> - Real-time balance updates</li>
              <li>• <strong>Account Types</strong> - Organize by purpose</li>
              <li>• <strong>Easy Transfers</strong> - Simple account management</li>
            </ul>
          </Card>

          {/* Asset Tracking */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border-orange-200/50 dark:border-orange-700/30">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-lg">Asset Tracking</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Business Assets</strong> - Equipment, property, investments</li>
              <li>• <strong>Value Tracking</strong> - Monitor asset appreciation</li>
              <li>• <strong>Depreciation</strong> - Track asset value changes</li>
              <li>• <strong>Net Worth</strong> - Complete financial picture</li>
            </ul>
          </Card>

          {/* Security */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border-cyan-200/50 dark:border-cyan-700/30">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              <h3 className="font-semibold text-lg">Secure & Private</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Data Encryption</strong> - Your financial data is secure</li>
              <li>• <strong>User Isolation</strong> - Complete data privacy</li>
              <li>• <strong>Modern Auth</strong> - Secure authentication system</li>
              <li>• <strong>GDPR Compliant</strong> - Privacy by design</li>
            </ul>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="p-6 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 mb-8">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="font-semibold mb-2">1. Describe in Natural Language</h4>
              <p className="text-sm text-muted-foreground">
                Simply tell the AI assistant about your financial activities in plain English
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">2. AI Processes & Analyzes</h4>
              <p className="text-sm text-muted-foreground">
                Our AI extracts key information and organizes it automatically
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold mb-2">3. Get Insights & Reports</h4>
              <p className="text-sm text-muted-foreground">
                View beautiful dashboards and receive AI-powered financial insights
              </p>
            </div>
          </div>
        </Card>

        {/* Getting Started */}
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Start Managing Your Finances Today
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Try These Examples</h4>
              <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 font-mono text-sm space-y-1">
                <div>"Paid $85.50 for marketing materials"</div>
                <div>"Received $1,200 payment from client"</div>
                <div>"Bought new laptop for $2,500"</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Ready to Get Started?</h4>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Join thousands of businesses using AI to simplify their financial management.
                </p>
                <HeroAuthButtons />
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
