import FinancialDashboard from "@/components/finance/financial-dashboard"
import AIAssistant from "@/components/finance/ai-assistant"
import AccountsManager from "@/components/finance/accounts-manager"
import InsightsPanel from "@/components/finance/insights-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <AIAssistant />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <InsightsPanel />
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <AccountsManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}