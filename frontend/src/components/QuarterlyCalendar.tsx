"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { QuarterlyEstimate } from "@/lib/api";

interface QuarterlyCalendarProps {
  estimates: QuarterlyEstimate[];
  onMarkPaid: (quarter: number, amount: number) => void;
}

export function QuarterlyCalendar({
  estimates,
  onMarkPaid,
}: QuarterlyCalendarProps) {
  const [editingQuarter, setEditingQuarter] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  const getQuarterStatus = (estimate: QuarterlyEstimate) => {
    const dueDate = new Date(estimate.due_date);
    const today = new Date();

    if (estimate.paid) return "paid";
    if (dueDate < today) return "overdue";
    if (dueDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000)
      return "upcoming";
    return "future";
  };

  const handleMarkPaid = (quarter: number) => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      onMarkPaid(quarter, amount);
      setEditingQuarter(null);
      setPaymentAmount("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Quarterly Tax Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {estimates.map((estimate) => {
            const status = getQuarterStatus(estimate);

            return (
              <div
                key={estimate.quarter}
                className={cn(
                  "border rounded-lg p-4",
                  status === "paid" &&
                    "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                  status === "overdue" &&
                    "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                  status === "upcoming" &&
                    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {status === "paid" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {status === "overdue" && (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    {status === "upcoming" && (
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                    {status === "future" && (
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold">Q{estimate.quarter}</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      status === "overdue" &&
                        "text-red-600 dark:text-red-400 font-medium"
                    )}
                  >
                    Due: {formatDate(estimate.due_date)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Federal:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(estimate.federal_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CA:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(estimate.california_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OK:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(estimate.oklahoma_amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-bold">
                      {formatCurrency(estimate.total_amount)}
                    </span>
                    {estimate.paid && estimate.paid_amount && (
                      <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                        (Paid: {formatCurrency(estimate.paid_amount)})
                      </span>
                    )}
                  </div>

                  {!estimate.paid &&
                    (editingQuarter === estimate.quarter ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Amount paid"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-32 h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(estimate.quarter)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingQuarter(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={status === "overdue" ? "destructive" : "outline"}
                        onClick={() => {
                          setEditingQuarter(estimate.quarter);
                          setPaymentAmount(estimate.total_amount.toString());
                        }}
                      >
                        Mark as Paid
                      </Button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Annual Estimated Tax:</span>
            <span className="text-xl font-bold">
              {formatCurrency(
                estimates.reduce((sum, e) => sum + e.total_amount, 0)
              )}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
            <span>Total Paid:</span>
            <span>
              {formatCurrency(
                estimates
                  .filter((e) => e.paid)
                  .reduce((sum, e) => sum + (e.paid_amount || 0), 0)
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
