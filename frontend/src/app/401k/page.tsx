"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PiggyBank, Calculator, TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContributionSlider } from "@/components/ContributionSlider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function Page401k() {
  const [formData, setFormData] = useState({
    annual_salary: 450000,
    current_contribution_percent: 6,
    ytd_contribution: 2711.55,
    remaining_pay_periods: 22,
    age: 35,
  });

  const { data: optimization, mutate: calculate, isPending } = useMutation({
    mutationFn: () => api.get401kOptimization({
      current_contribution_percent: formData.current_contribution_percent,
      annual_salary: formData.annual_salary,
      ytd_contribution: formData.ytd_contribution,
      remaining_pay_periods: formData.remaining_pay_periods,
      age: formData.age,
    }),
  });

  // Mock optimization result
  const mockOptimization = {
    current_contribution_percent: formData.current_contribution_percent,
    recommended_percent: 13.5,
    remaining_contribution_room: 20788.45,
    max_contribution: 23500,
    projected_year_end_contribution: 23500,
    tax_savings: 7520,
  };

  const result = optimization || mockOptimization;
  const catchUpEligible = formData.age >= 50;
  const effectiveMax = catchUpEligible ? 31000 : 23500;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">401(k) Optimizer</h1>
        <p className="text-muted-foreground">
          Maximize your retirement contributions and tax savings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="salary">Annual Salary</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="salary"
                  type="number"
                  value={formData.annual_salary}
                  onChange={(e) =>
                    handleInputChange("annual_salary", Number(e.target.value))
                  }
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ytd">YTD 401(k) Contribution</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="ytd"
                  type="number"
                  value={formData.ytd_contribution}
                  onChange={(e) =>
                    handleInputChange("ytd_contribution", Number(e.target.value))
                  }
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="current">Current Contribution %</Label>
              <div className="relative mt-1">
                <Input
                  id="current"
                  type="number"
                  value={formData.current_contribution_percent}
                  onChange={(e) =>
                    handleInputChange(
                      "current_contribution_percent",
                      Number(e.target.value)
                    )
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="periods">Remaining Pay Periods</Label>
              <Input
                id="periods"
                type="number"
                value={formData.remaining_pay_periods}
                onChange={(e) =>
                  handleInputChange(
                    "remaining_pay_periods",
                    Number(e.target.value)
                  )
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bi-weekly pay = 26 periods/year
              </p>
            </div>

            <div>
              <Label htmlFor="age">Your Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) =>
                  handleInputChange("age", Number(e.target.value))
                }
                className="mt-1"
              />
              {catchUpEligible && (
                <p className="text-xs text-green-600 mt-1">
                  Eligible for $7,500 catch-up contribution!
                </p>
              )}
            </div>

            <Button className="w-full" onClick={() => calculate()} disabled={isPending}>
              {isPending ? "Calculating..." : "Calculate Recommendation"}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ContributionSlider
            annualSalary={formData.annual_salary}
            currentPercent={formData.current_contribution_percent}
            ytdContribution={formData.ytd_contribution}
            remainingPayPeriods={formData.remaining_pay_periods}
            recommendedPercent={result.recommended_percent}
            maxContribution={23500}
            catchUpEligible={catchUpEligible}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              2025 Contribution Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(effectiveMax)}
            </div>
            {catchUpEligible && (
              <p className="text-xs text-green-600">
                Includes $7,500 catch-up
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(effectiveMax - formData.ytd_contribution)}
            </div>
            <p className="text-xs text-muted-foreground">
              Left to contribute this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recommended Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {result.recommended_percent}%
            </div>
            <p className="text-xs text-muted-foreground">
              To max out by year end
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Tax Savings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-4">If You Max Out</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span>Federal Tax Savings (24-32%)</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(effectiveMax * 0.28)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span>California Tax Savings (9.3%)</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(effectiveMax * 0.093)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10 rounded font-medium">
                  <span>Total Tax Savings</span>
                  <span className="text-green-600">
                    {formatCurrency(effectiveMax * 0.373)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Key Considerations</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="font-medium">Employer Match</p>
                  <p className="text-muted-foreground">
                    Make sure to contribute at least enough to get your full
                    employer match before maximizing.
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <p className="font-medium">Over-Contribution Warning</p>
                  <p className="text-muted-foreground">
                    Contributing more than the annual limit results in penalties.
                    The optimizer accounts for this.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="font-medium">Tax-Deferred Growth</p>
                  <p className="text-muted-foreground">
                    Your contributions grow tax-deferred until withdrawal in
                    retirement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
