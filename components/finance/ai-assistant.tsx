"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Check, X, Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface ParsedData {
  entry_type: "transaction" | "asset";
  data: {
    type?: "income" | "expense";
    amount: number;
    description?: string;
    category?: string;
    transaction_date?: string;
    name?: string;
    asset_type?: string;
    initial_value?: number;
    acquisition_date?: string;
  };
}

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse text");
      }

      const data = await response.json();
      setParsedData(data);
      setShowConfirmation(true);
    } catch (error) {
      toast.error("Failed to parse your input. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedData) return;

    // Validate required fields
    if (parsedData.entry_type === "transaction") {
      if (!parsedData.data.type || !parsedData.data.amount) {
        toast.error("Missing required transaction information. Please try again.");
        return;
      }
    } else if (parsedData.entry_type === "asset") {
      if (!parsedData.data.name || !parsedData.data.initial_value || !parsedData.data.acquisition_date) {
        toast.error("Missing required asset information. Please try again.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (parsedData.entry_type === "transaction") {
        // Get available accounts first
        const accountsResponse = await fetch("/api/accounts");
        if (!accountsResponse.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const accountsData = await accountsResponse.json();

        if (!accountsData.accounts || accountsData.accounts.length === 0) {
          toast.error("No accounts found. Please create an account first.");
          return;
        }

        // Use the first available account
        const accountId = accountsData.accounts[0].id;

        // Create transaction
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            type: parsedData.data.type,
            amount: parsedData.data.amount,
            description: parsedData.data.description,
            category: parsedData.data.category,
            transactionDate: parsedData.data.transaction_date,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create transaction");
        }
      } else if (parsedData.entry_type === "asset") {
        // Create asset
        const response = await fetch("/api/assets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: parsedData.data.name,
            type: parsedData.data.asset_type,
            initialValue: parsedData.data.initial_value,
            acquisitionDate: parsedData.data.acquisition_date,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create asset");
        }
      }

      toast.success(
        `${
          parsedData.entry_type === "transaction" ? "Transaction" : "Asset"
        } has been added successfully.`
      );

      // Reset form
      setInput("");
      setParsedData(null);
      setShowConfirmation(false);
    } catch (error) {
      toast.error("Failed to save your data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setShowConfirmation(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleParse();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          AI Financial Assistant
        </CardTitle>
        <CardDescription>
          Describe your financial activity in natural language and I'll help you record it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., 'Paid $50 for office supplies' or 'Received $1,200 payment from Acme Corp'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Parse"
            )}
          </Button>
        </form>

        {/* Confirmation Dialog */}
        {showConfirmation && parsedData && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline">
                  {parsedData.entry_type === "transaction" ? (
                    <DollarSign className="h-3 w-3 mr-1" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  {parsedData.entry_type}
                </Badge>
                Please Confirm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!parsedData.data || (parsedData.entry_type === "transaction" && !parsedData.data?.type) ? (
                <div className="text-center py-4 text-red-600">
                  <p className="font-medium">Failed to parse your input</p>
                  <p className="text-sm">Please try again with more specific details</p>
                </div>
              ) : parsedData.entry_type === "transaction" ? (
                <div className="space-y-2">
                  {parsedData.data?.type && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant={parsedData.data.type === "income" ? "default" : "destructive"}>
                        {parsedData.data.type}
                      </Badge>
                    </div>
                  )}
                  {parsedData.data?.amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-medium">${parsedData.data.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {parsedData.data?.description && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <span className="font-medium">{parsedData.data.description}</span>
                    </div>
                  )}
                  {parsedData.data?.category && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <Badge variant="secondary">{parsedData.data.category}</Badge>
                    </div>
                  )}
                  {parsedData.data?.transaction_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="font-medium">{parsedData.data.transaction_date}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {parsedData.data?.name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="font-medium">{parsedData.data.name}</span>
                    </div>
                  )}
                  {parsedData.data?.asset_type && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant="secondary">{parsedData.data.asset_type}</Badge>
                    </div>
                  )}
                  {parsedData.data?.initial_value && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Initial Value:</span>
                      <span className="font-medium">${parsedData.data.initial_value.toFixed(2)}</span>
                    </div>
                  )}
                  {parsedData.data?.acquisition_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Acquisition Date:</span>
                      <span className="font-medium">{parsedData.data.acquisition_date}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Confirm
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Examples */}
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Try these examples:</p>
          <ul className="space-y-1">
            <li>• "Bought office supplies for $75.50 from Staples"</li>
            <li>• "Received $2,500 payment from client ABC Corp"</li>
            <li>• "Paid $120 monthly software subscription"</li>
            <li>• "Added a new MacBook Pro worth $2,500 as company asset"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}