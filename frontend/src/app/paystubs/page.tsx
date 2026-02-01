"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Trash2, Edit2 } from "lucide-react";
import { PaystubUploader } from "@/components/PaystubUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, Paystub } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaystubsPage() {
  const queryClient = useQueryClient();

  const { data: paystubs, isLoading } = useQuery({
    queryKey: ["paystubs"],
    queryFn: () => api.getPaystubs(),
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["paystubs"] });
    queryClient.invalidateQueries({ queryKey: ["taxProjection"] });
  };

  // Mock data for demonstration
  const mockPaystubs: Paystub[] = [
    {
      id: "1",
      pay_date: "2025-01-15",
      gross_pay: 17307.69,
      federal_withheld: 3800,
      state_withheld: 1850,
      fica_withheld: 1324,
      net_pay: 10333.69,
      _401k_contribution: 903.85,
    },
    {
      id: "2",
      pay_date: "2025-01-31",
      gross_pay: 17307.69,
      federal_withheld: 3800,
      state_withheld: 1850,
      fica_withheld: 1324,
      net_pay: 10333.69,
      _401k_contribution: 903.85,
    },
    {
      id: "3",
      pay_date: "2025-02-14",
      gross_pay: 17307.69,
      federal_withheld: 3800,
      state_withheld: 1850,
      fica_withheld: 1324,
      net_pay: 10333.69,
      _401k_contribution: 903.85,
      rsu_income: 25000,
    },
  ];

  const displayPaystubs = paystubs || mockPaystubs;

  const totals = displayPaystubs.reduce(
    (acc, ps) => ({
      gross: acc.gross + ps.gross_pay,
      federal: acc.federal + ps.federal_withheld,
      state: acc.state + ps.state_withheld,
      fica: acc.fica + ps.fica_withheld,
      _401k: acc._401k + ps._401k_contribution,
      net: acc.net + ps.net_pay,
      rsu: acc.rsu + (ps.rsu_income || 0),
    }),
    { gross: 0, federal: 0, state: 0, fica: 0, _401k: 0, net: 0, rsu: 0 }
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Paystubs</h1>
        <p className="text-muted-foreground">
          Upload and manage your paystub records
        </p>
      </div>

      <PaystubUploader onUploadSuccess={handleUploadSuccess} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Paystub History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Pay Date</th>
                    <th className="text-right p-3 font-medium">Gross Pay</th>
                    <th className="text-right p-3 font-medium">Federal</th>
                    <th className="text-right p-3 font-medium">State</th>
                    <th className="text-right p-3 font-medium">FICA</th>
                    <th className="text-right p-3 font-medium">401(k)</th>
                    <th className="text-right p-3 font-medium">RSU</th>
                    <th className="text-right p-3 font-medium">Net Pay</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPaystubs.map((paystub) => (
                    <tr key={paystub.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{formatDate(paystub.pay_date)}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(paystub.gross_pay)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        -{formatCurrency(paystub.federal_withheld)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        -{formatCurrency(paystub.state_withheld)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        -{formatCurrency(paystub.fica_withheld)}
                      </td>
                      <td className="p-3 text-right text-blue-600">
                        -{formatCurrency(paystub._401k_contribution)}
                      </td>
                      <td className="p-3 text-right">
                        {paystub.rsu_income
                          ? formatCurrency(paystub.rsu_income)
                          : "-"}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(paystub.net_pay)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-medium">
                    <td className="p-3">YTD Totals</td>
                    <td className="p-3 text-right">
                      {formatCurrency(totals.gross)}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      -{formatCurrency(totals.federal)}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      -{formatCurrency(totals.state)}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      -{formatCurrency(totals.fica)}
                    </td>
                    <td className="p-3 text-right text-blue-600">
                      -{formatCurrency(totals._401k)}
                    </td>
                    <td className="p-3 text-right">
                      {totals.rsu > 0 ? formatCurrency(totals.rsu) : "-"}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(totals.net)}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YTD Gross Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.gross + totals.rsu)}
            </div>
            {totals.rsu > 0 && (
              <p className="text-xs text-muted-foreground">
                Includes {formatCurrency(totals.rsu)} RSU income
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YTD Tax Withheld
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.federal + totals.state + totals.fica)}
            </div>
            <p className="text-xs text-muted-foreground">
              Federal + State + FICA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YTD 401(k) Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals._401k)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totals._401k / 23500) * 100).toFixed(1)}% of 2025 limit
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
