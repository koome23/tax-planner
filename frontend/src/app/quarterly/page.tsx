"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuarterlyCalendar } from "@/components/QuarterlyCalendar";
import { api, QuarterlyEstimate } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function QuarterlyPage() {
  const queryClient = useQueryClient();

  const { data: estimates, isLoading } = useQuery({
    queryKey: ["quarterlyEstimates"],
    queryFn: () => api.getQuarterlyEstimates(),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ quarter, amount }: { quarter: number; amount: number }) =>
      api.markQuarterlyPaid(quarter, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarterlyEstimates"] });
    },
  });

  // Mock data for demonstration
  const mockEstimates: QuarterlyEstimate[] = [
    {
      quarter: 1,
      due_date: "2025-04-15",
      federal_amount: 12500,
      california_amount: 5300,
      oklahoma_amount: 1100,
      total_amount: 18900,
      paid: true,
      paid_amount: 18900,
    },
    {
      quarter: 2,
      due_date: "2025-06-15",
      federal_amount: 12500,
      california_amount: 5300,
      oklahoma_amount: 1100,
      total_amount: 18900,
      paid: false,
    },
    {
      quarter: 3,
      due_date: "2025-09-15",
      federal_amount: 12500,
      california_amount: 5300,
      oklahoma_amount: 1100,
      total_amount: 18900,
      paid: false,
    },
    {
      quarter: 4,
      due_date: "2026-01-15",
      federal_amount: 12500,
      california_amount: 5300,
      oklahoma_amount: 1100,
      total_amount: 18900,
      paid: false,
    },
  ];

  const displayEstimates = estimates || mockEstimates;

  const handleMarkPaid = (quarter: number, amount: number) => {
    markPaidMutation.mutate({ quarter, amount });
  };

  const totalAnnual = displayEstimates.reduce((sum, e) => sum + e.total_amount, 0);
  const totalPaid = displayEstimates
    .filter((e) => e.paid)
    .reduce((sum, e) => sum + (e.paid_amount || 0), 0);
  const totalRemaining = totalAnnual - totalPaid;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Quarterly Tax Estimates</h1>
        <p className="text-muted-foreground">
          Track and manage your estimated tax payments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Annual Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAnnual)}</div>
            <p className="text-xs text-muted-foreground">
              Federal + CA + OK combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayEstimates.filter((e) => e.paid).length} of 4 quarters paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayEstimates.filter((e) => !e.paid).length} payments remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <QuarterlyCalendar
        estimates={displayEstimates}
        onMarkPaid={handleMarkPaid}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Safe Harbor Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">110% Prior Year Safe Harbor</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Pay 110% of your prior year tax liability to avoid underpayment
                penalties, regardless of your current year liability.
              </p>
              <div className="text-lg font-bold">
                Required: {formatCurrency(165000 * 1.1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on $165,000 prior year liability
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium mb-2">90% Current Year Safe Harbor</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Alternatively, pay at least 90% of your current year tax
                liability to meet safe harbor requirements.
              </p>
              <div className="text-lg font-bold">
                Required: {formatCurrency(totalAnnual * 0.9 * 4)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on current projections
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium mb-2">2025 Due Dates</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Q1</p>
                <p className="text-muted-foreground">April 15, 2025</p>
              </div>
              <div>
                <p className="font-medium">Q2</p>
                <p className="text-muted-foreground">June 15, 2025</p>
              </div>
              <div>
                <p className="font-medium">Q3</p>
                <p className="text-muted-foreground">September 15, 2025</p>
              </div>
              <div>
                <p className="font-medium">Q4</p>
                <p className="text-muted-foreground">January 15, 2026</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Dual-State Filing Notes</h3>
            <p className="text-sm text-muted-foreground">
              With income in both California and Oklahoma, you may need to file
              estimated payments to both states. California requires quarterly
              estimates if you expect to owe $500 or more. Oklahoma requires
              estimates if you expect to owe $1,000 or more. Credit for taxes
              paid to Oklahoma can offset California liability on dual-taxed
              income.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
