"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

interface TaxProjectionChartProps {
  data: {
    federal_tax: number;
    california_tax: number;
    oklahoma_tax: number;
    fica_tax: number;
    withheld_ytd: number;
    projected_liability: number;
  };
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea"];

export function TaxProjectionChart({ data }: TaxProjectionChartProps) {
  const barData = [
    {
      name: "Federal",
      projected: data.federal_tax,
      color: COLORS[0],
    },
    {
      name: "California",
      projected: data.california_tax,
      color: COLORS[1],
    },
    {
      name: "Oklahoma",
      projected: data.oklahoma_tax,
      color: COLORS[2],
    },
    {
      name: "FICA",
      projected: data.fica_tax,
      color: COLORS[3],
    },
  ];

  const pieData = [
    { name: "Federal", value: data.federal_tax },
    { name: "California", value: data.california_tax },
    { name: "Oklahoma", value: data.oklahoma_tax },
    { name: "FICA", value: data.fica_tax },
  ];

  const comparisonData = [
    {
      name: "Tax Status",
      Withheld: data.withheld_ytd,
      Projected: data.projected_liability,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="breakdown">
          <TabsList className="mb-4">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">Withheld vs Owed</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "#000" }}
                />
                <Bar dataKey="projected" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Withheld" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projected" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              {data.withheld_ytd > data.projected_liability ? (
                <p className="text-green-600 font-medium">
                  Projected Refund:{" "}
                  {formatCurrency(data.withheld_ytd - data.projected_liability)}
                </p>
              ) : (
                <p className="text-red-600 font-medium">
                  Additional Tax Owed:{" "}
                  {formatCurrency(data.projected_liability - data.withheld_ytd)}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
