"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { TaxProjectionChart } from "@/components/TaxProjectionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function Dashboard() {
  const { data: projection, isLoading } = useQuery({
    queryKey: ["taxProjection"],
    queryFn: () => api.getProjection(),
  });

  const { data: quarterlyEstimates } = useQuery({
    queryKey: ["quarterlyEstimates"],
    queryFn: () => api.getQuarterlyEstimates(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mock data for demonstration when API is not available
  const mockProjection = {
    gross_income: 450000,
    federal_tax: 98500,
    california_tax: 42300,
    oklahoma_tax: 8500,
    fica_tax: 18750,
    total_tax: 168050,
    effective_rate: 37.3,
    withheld_ytd: 145000,
    projected_liability: 168050,
    refund_or_owed: -23050,
  };

  const data = projection || mockProjection;

  const unpaidQuarters =
    quarterlyEstimates?.filter((q) => !q.paid && new Date(q.due_date) < new Date())
      .length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          2025 Tax Overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="YTD Gross Income"
          value={formatCurrency(data.gross_income)}
          icon={DollarSign}
          description="Total earnings this year"
        />
        <DashboardCard
          title="Total Tax Withheld"
          value={formatCurrency(data.withheld_ytd)}
          icon={Receipt}
          description="Federal, state, and FICA"
        />
        <DashboardCard
          title="Projected Liability"
          value={formatCurrency(data.projected_liability)}
          icon={TrendingDown}
          description="Estimated year-end total"
        />
        <DashboardCard
          title={data.refund_or_owed >= 0 ? "Projected Refund" : "Additional Owed"}
          value={formatCurrency(Math.abs(data.refund_or_owed))}
          icon={data.refund_or_owed >= 0 ? TrendingUp : TrendingDown}
          trend={data.refund_or_owed >= 0 ? "up" : "down"}
          description="Based on current withholding"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TaxProjectionChart data={data} />

        <Card>
          <CardHeader>
            <CardTitle>Tax Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Effective Tax Rate</span>
                <span className="text-sm font-bold">
                  {formatPercent(data.effective_rate)}
                </span>
              </div>
              <Progress value={data.effective_rate} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Federal Income Tax</span>
                <span className="font-medium">
                  {formatCurrency(data.federal_tax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>California State Tax</span>
                <span className="font-medium">
                  {formatCurrency(data.california_tax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Oklahoma State Tax</span>
                <span className="font-medium">
                  {formatCurrency(data.oklahoma_tax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>FICA (SS + Medicare)</span>
                <span className="font-medium">
                  {formatCurrency(data.fica_tax)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total Tax Burden</span>
                <span>{formatCurrency(data.total_tax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.refund_or_owed < -5000 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Consider increasing withholding</p>
                  <p className="text-sm text-muted-foreground">
                    You may owe {formatCurrency(Math.abs(data.refund_or_owed))} at
                    year end
                  </p>
                </div>
              </div>
            )}
            {unpaidQuarters > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Overdue quarterly payments</p>
                  <p className="text-sm text-muted-foreground">
                    {unpaidQuarters} quarterly payment(s) past due
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">401(k) optimization available</p>
                <p className="text-sm text-muted-foreground">
                  Check your 401(k) page for contribution recommendations
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
