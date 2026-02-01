"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface ContributionSliderProps {
  annualSalary: number;
  currentPercent: number;
  ytdContribution: number;
  remainingPayPeriods: number;
  recommendedPercent: number;
  maxContribution?: number;
  catchUpEligible?: boolean;
  onPercentChange?: (percent: number) => void;
}

export function ContributionSlider({
  annualSalary,
  currentPercent,
  ytdContribution,
  remainingPayPeriods,
  recommendedPercent,
  maxContribution = 23500,
  catchUpEligible = false,
  onPercentChange,
}: ContributionSliderProps) {
  const [percent, setPercent] = useState(currentPercent);
  const effectiveMax = catchUpEligible ? maxContribution + 7500 : maxContribution;

  const calculateProjection = (contributionPercent: number) => {
    const perPayPeriodSalary = annualSalary / 26; // Bi-weekly
    const perPayPeriodContribution = (perPayPeriodSalary * contributionPercent) / 100;
    let projected = ytdContribution;
    const data = [];

    for (let i = 0; i <= remainingPayPeriods; i++) {
      data.push({
        payPeriod: i,
        contribution: Math.min(projected, effectiveMax),
        max: effectiveMax,
      });
      projected += perPayPeriodContribution;
    }

    return data;
  };

  const projectionData = calculateProjection(percent);
  const projectedYearEnd = Math.min(
    ytdContribution +
      (annualSalary / 26) * (percent / 100) * remainingPayPeriods,
    effectiveMax
  );

  const taxSavings = projectedYearEnd * 0.32; // Approximate marginal rate

  useEffect(() => {
    onPercentChange?.(percent);
  }, [percent, onPercentChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>401(k) Contribution Optimizer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">YTD Contribution:</span>
            <span className="ml-2 font-medium">
              {formatCurrency(ytdContribution)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">2025 Limit:</span>
            <span className="ml-2 font-medium">
              {formatCurrency(effectiveMax)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Remaining Room:</span>
            <span className="ml-2 font-medium">
              {formatCurrency(effectiveMax - ytdContribution)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Pay Periods Left:</span>
            <span className="ml-2 font-medium">{remainingPayPeriods}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Contribution Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={percent}
                onChange={(e) =>
                  setPercent(Math.min(100, Math.max(0, Number(e.target.value))))
                }
                className="w-20 text-right"
                min={0}
                max={100}
              />
              <span>%</span>
            </div>
          </div>
          <Slider
            value={[percent]}
            onValueChange={(values) => setPercent(values[0])}
            max={75}
            step={0.5}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-primary font-medium">
              Recommended: {recommendedPercent}%
            </span>
            <span>75%</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="payPeriod"
                label={{
                  value: "Pay Periods Remaining",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={[0, effectiveMax * 1.1]}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Pay Period ${label}`}
              />
              <ReferenceLine
                y={effectiveMax}
                stroke="#dc2626"
                strokeDasharray="5 5"
                label={{ value: "Max", fill: "#dc2626", position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="contribution"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Projected Year-End</p>
            <p className="text-2xl font-bold">
              {formatCurrency(projectedYearEnd)}
            </p>
            {projectedYearEnd >= effectiveMax && (
              <p className="text-xs text-green-600">Will max out!</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Est. Tax Savings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(taxSavings)}
            </p>
            <p className="text-xs text-muted-foreground">At 32% marginal rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
