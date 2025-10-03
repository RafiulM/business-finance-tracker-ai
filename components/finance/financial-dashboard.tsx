"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Calendar,
  Target,
  Lightbulb
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    cashFlow: number;
    netWorth: number;
    dateRange: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  transactionsByCategory: Array<{
    category: string;
    type: string;
    total: number;
  }>;
  recentTransactions: Array<{
    id: string;
    accountName: string;
    type: string;
    amount: string;
    description: string;
    category: string;
    transactionDate: string;
  }>;
  assets: {
    count: number;
    totalValue: number;
    recent: Array<{
      id: string;
      name: string;
      type: string;
      initialValue: string;
      currentValue: string;
      acquisitionDate: string;
    }>;
  };
  insights: Array<{
    id: string;
    content: string;
    generatedAt: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function FinancialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard-data?range=${dateRange}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markInsightAsRead = async (insightId: string) => {
    try {
      await fetch(`/api/insights/${insightId}/read`, {
        method: "POST",
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-24 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Prepare data for charts
  const expenseData = data.transactionsByCategory
    .filter(item => item.type === 'expense')
    .map(item => ({
      name: item.category,
      value: item.total,
    }));

  const monthlyData = data.monthlyTrends.map(item => ({
    month: item.month,
    income: item.income,
    expenses: item.expenses,
    cashFlow: item.income - item.expenses,
  }));

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your business finances for the last {data.summary.dateRange.days} days
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${data.summary.totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${data.summary.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +5.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(data.summary.cashFlow).toLocaleString()}
              {data.summary.cashFlow < 0 && ' (negative)'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.cashFlow >= 0 ? 'Positive' : 'Negative'} cash flow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${data.summary.netWorth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total assets and cash
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Expense Breakdown Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly Trends
            </CardTitle>
            <CardDescription>Income vs expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" name="Income" />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {data.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description || transaction.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.accountName} • {transaction.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Insights
            </CardTitle>
            <CardDescription>Personalized financial recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.insights.map((insight) => (
                <div key={insight.id} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm">{insight.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(insight.generatedAt).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markInsightAsRead(insight.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}