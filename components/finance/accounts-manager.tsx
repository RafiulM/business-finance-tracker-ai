"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet, CreditCard, DollarSign, Building } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  createdAt: string;
}

const ACCOUNT_TYPES = [
  { value: "Bank Account", label: "Bank Account", icon: Building },
  { value: "Credit Card", label: "Credit Card", icon: CreditCard },
  { value: "Cash", label: "Cash", icon: DollarSign },
  { value: "Investment", label: "Investment", icon: Wallet },
  { value: "Other", label: "Other", icon: Wallet },
];

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    balance: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");

      const data = await response.json();
      setAccounts(data.accounts);
    } catch (error) {
      toast.error("Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      toast.error("Name and type are required");
      return;
    }

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          balance: formData.balance || "0.00",
        }),
      });

      if (!response.ok) throw new Error("Failed to create account");

      const newAccount = await response.json();
      setAccounts([...accounts, newAccount]);

      // Reset form
      setFormData({ name: "", type: "", balance: "" });
      setIsDialogOpen(false);

      toast.success("Account created successfully");
    } catch (error) {
      toast.error("Failed to create account");
    }
  };

  const getAccountIcon = (type: string) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    return accountType ? accountType.icon : Wallet;
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount) || 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Manage your financial accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Manage your financial accounts</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Add a new financial account to track your money
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Account Name
                </label>
                <Input
                  id="name"
                  placeholder="e.g., Chase Checking, Business Savings"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  Account Type
                </label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="balance" className="text-sm font-medium">
                  Initial Balance (optional)
                </label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Account
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => {
              const Icon = getAccountIcon(account.type);
              return (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {account.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-lg">
                      {formatCurrency(account.balance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(account.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first account to start tracking your finances
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}