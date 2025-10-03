"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Insight {
  id: string;
  content: string;
  generatedAt: string;
  isRead: boolean;
}

interface InsightsPanelProps {
  userId?: string;
  limit?: number;
  showGenerateButton?: boolean;
}

export default function InsightsPanel({
  userId,
  limit = 10,
  showGenerateButton = true
}: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/insights?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch insights");

      const data = await response.json();
      setInsights(data.insights);
      setCanGenerate(true); // Assume user can always generate new insights
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate insights");
      }

      const data = await response.json();
      toast.success(data.message || "Generated new insights successfully");

      // Refresh insights list
      fetchInsights();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/read`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to mark insight as read");

      setInsights(insights.map(insight =>
        insight.id === insightId
          ? { ...insight, isRead: true }
          : insight
      ));
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription>Loading your financial insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
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
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription>
            Personalized financial recommendations powered by AI
          </CardDescription>
        </div>
        {showGenerateButton && canGenerate && (
          <Button
            onClick={generateInsights}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 border rounded-lg transition-colors ${
                  !insight.isRead
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={insight.isRead ? "secondary" : "default"} className="text-xs">
                        {insight.isRead ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Read
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            New
                          </>
                        )}
                      </Badge>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: insight.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br>')
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(insight.generatedAt)}
                    </p>
                  </div>
                  {!insight.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead(insight.id)}
                      className="shrink-0"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights yet</h3>
            <p className="text-muted-foreground mb-4">
              Start recording transactions and generate your first AI-powered insights
            </p>
            {showGenerateButton && (
              <Button onClick={generateInsights} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}