"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  RefreshCw,
  Calendar,
  Upload,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RSUUploader } from "@/components/RSUUploader";
import { api, RSUPosition, RSUVestingEvent, RSUVestingScheduleSummary } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export default function RSUPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RSUVestingEvent | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    grant_id: "",
    symbol: "",
    grant_date: "",
    vesting_date: "",
    shares_vesting: "",
    fmv_at_vest: "",
  });

  // Fetch vesting schedule data
  const { data: vestingSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["rsuVestingSummary"],
    queryFn: () => api.getRSUVestingSummary(),
  });

  const { data: vestingEvents } = useQuery({
    queryKey: ["rsuVestingEvents"],
    queryFn: () => api.getRSUVestingEvents(),
  });

  // E*Trade positions (legacy)
  const { data: positions, isLoading, refetch } = useQuery({
    queryKey: ["rsuPositions"],
    queryFn: () => api.getRSUPositions(),
    enabled: false,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadRSUCSV(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsuVestingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["rsuVestingEvents"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (event: any) => api.createRSUVestingEvent(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsuVestingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["rsuVestingEvents"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, event }: { eventId: string; event: any }) =>
      api.updateRSUVestingEvent(eventId, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsuVestingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["rsuVestingEvents"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => api.deleteRSUVestingEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsuVestingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["rsuVestingEvents"] });
    },
  });

  const handleConnectETrade = async () => {
    setIsConnecting(true);
    try {
      const { auth_url } = await api.getEtradeAuthUrl();
      window.open(auth_url, "_blank", "width=600,height=700");
    } catch (error) {
      console.error("Failed to get auth URL:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      grant_id: "",
      symbol: "",
      grant_date: "",
      vesting_date: "",
      shares_vesting: "",
      fmv_at_vest: "",
    });
    setEditingEvent(null);
    setShowManualForm(false);
  };

  const handleEdit = (event: RSUVestingEvent) => {
    setEditingEvent(event);
    setFormData({
      grant_id: event.grant_id,
      symbol: event.symbol,
      grant_date: event.grant_date,
      vesting_date: event.vesting_date,
      shares_vesting: event.shares_vesting.toString(),
      fmv_at_vest: event.fmv_at_vest.toString(),
    });
    setShowManualForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventData = {
      grant_id: formData.grant_id,
      symbol: formData.symbol.toUpperCase(),
      grant_date: formData.grant_date,
      vesting_date: formData.vesting_date,
      shares_vesting: parseInt(formData.shares_vesting),
      fmv_at_vest: parseFloat(formData.fmv_at_vest),
    };

    if (editingEvent) {
      updateMutation.mutate({ eventId: editingEvent.id, event: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  // Prepare chart data from vesting schedule
  const chartData =
    vestingSummary?.upcoming_vests.map((vest) => {
      const d = new Date(vest.vesting_date);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return {
        date: `${month} ${year}`,
        shares: vest.shares_vesting,
        value: vest.total_value,
      };
    }) || [];

  // Calculate totals from vesting summary
  const totals = vestingSummary
    ? {
        value: vestingSummary.total_shares_pending * 185.25, // Mock current price
        shares: vestingSummary.total_shares_granted,
        vested: vestingSummary.total_shares_vested,
        pending: vestingSummary.total_shares_pending,
      }
    : { value: 0, shares: 0, vested: 0, pending: 0 };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RSU Tracker</h1>
          <p className="text-muted-foreground">
            Track your Restricted Stock Units and vesting schedule
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry & CSV</TabsTrigger>
          <TabsTrigger value="etrade">E*Trade Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          {/* CSV Upload */}
          <RSUUploader
            onUploadSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["rsuVestingSummary"] });
              queryClient.invalidateQueries({ queryKey: ["rsuVestingEvents"] });
            }}
          />

          {/* Manual Entry Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manual Entry</CardTitle>
                <Button
                  variant={showManualForm ? "outline" : "default"}
                  onClick={() => {
                    setShowManualForm(!showManualForm);
                    if (showManualForm) resetForm();
                  }}
                >
                  {showManualForm ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vesting Event
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showManualForm && (
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="grant_id">Grant ID</Label>
                      <Input
                        id="grant_id"
                        value={formData.grant_id}
                        onChange={(e) =>
                          setFormData({ ...formData, grant_id: e.target.value })
                        }
                        placeholder="GRANT-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input
                        id="symbol"
                        value={formData.symbol}
                        onChange={(e) =>
                          setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                        }
                        placeholder="GOOG"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="grant_date">Grant Date</Label>
                      <Input
                        id="grant_date"
                        type="date"
                        value={formData.grant_date}
                        onChange={(e) =>
                          setFormData({ ...formData, grant_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="vesting_date">Vesting Date</Label>
                      <Input
                        id="vesting_date"
                        type="date"
                        value={formData.vesting_date}
                        onChange={(e) =>
                          setFormData({ ...formData, vesting_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="shares_vesting">Shares Vesting</Label>
                      <Input
                        id="shares_vesting"
                        type="number"
                        value={formData.shares_vesting}
                        onChange={(e) =>
                          setFormData({ ...formData, shares_vesting: e.target.value })
                        }
                        placeholder="125"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="fmv_at_vest">FMV at Vest ($/share)</Label>
                      <Input
                        id="fmv_at_vest"
                        type="number"
                        step="0.01"
                        value={formData.fmv_at_vest}
                        onChange={(e) =>
                          setFormData({ ...formData, fmv_at_vest: e.target.value })
                        }
                        placeholder="140.50"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingEvent ? "Update" : "Add"} Vesting Event
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Summary Cards */}
          {vestingSummary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Grants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{vestingSummary.total_grants}</div>
                  <p className="text-xs text-muted-foreground">Active grants</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Shares Granted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vestingSummary.total_shares_granted.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">All grants</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Shares Vested
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {vestingSummary.total_shares_vested.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Already vested</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Shares Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vestingSummary.total_shares_pending.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Future vests</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vesting Schedule */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Vesting Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Vest Date: ${label}`}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="value"
                          stroke="#2563eb"
                          fill="#2563eb"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    <div className="mt-4 space-y-2">
                      {vestingSummary?.upcoming_vests.slice(0, 6).map((vest) => (
                        <div
                          key={vest.id}
                          className="flex justify-between items-center p-2 rounded bg-muted"
                        >
                          <div>
                            <span className="font-medium">{formatDate(vest.vesting_date)}</span>
                            <span className="text-muted-foreground ml-2">
                              {vest.shares_vesting} shares @ {vest.symbol}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(vest.total_value)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEdit(vest)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={() => {
                                if (confirm("Delete this vesting event?")) {
                                  deleteMutation.mutate(vest.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming vesting events. Upload a CSV or add events manually.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Vests</CardTitle>
              </CardHeader>
              <CardContent>
                {vestingSummary?.past_vests && vestingSummary.past_vests.length > 0 ? (
                  <div className="space-y-2">
                    {vestingSummary.past_vests.slice(0, 6).map((vest) => (
                      <div
                        key={vest.id}
                        className="flex justify-between items-center p-2 rounded bg-muted"
                      >
                        <div>
                          <span className="font-medium">{formatDate(vest.vesting_date)}</span>
                          <span className="text-muted-foreground ml-2">
                            {vest.shares_vesting} shares @ {vest.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(vest.total_value)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEdit(vest)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No past vesting events recorded.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Events Table */}
          {vestingEvents && vestingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Vesting Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Grant ID</th>
                        <th className="text-left p-3 font-medium">Symbol</th>
                        <th className="text-left p-3 font-medium">Grant Date</th>
                        <th className="text-left p-3 font-medium">Vesting Date</th>
                        <th className="text-right p-3 font-medium">Shares</th>
                        <th className="text-right p-3 font-medium">FMV</th>
                        <th className="text-right p-3 font-medium">Value</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vestingEvents
                        .sort((a, b) => new Date(a.vesting_date).getTime() - new Date(b.vesting_date).getTime())
                        .map((event) => (
                          <tr key={event.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">{event.grant_id}</td>
                            <td className="p-3 font-medium">{event.symbol}</td>
                            <td className="p-3">{formatDate(event.grant_date)}</td>
                            <td className="p-3">{formatDate(event.vesting_date)}</td>
                            <td className="p-3 text-right">{event.shares_vesting}</td>
                            <td className="p-3 text-right">${event.fmv_at_vest.toFixed(2)}</td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(event.total_value)}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(event)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() => {
                                    if (confirm("Delete this vesting event?")) {
                                      deleteMutation.mutate(event.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="etrade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>E*Trade Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connect to E*Trade to automatically import your RSU positions. Note: E*Trade API
                may not provide detailed vesting schedules. Consider using CSV upload or manual
                entry for complete vesting schedule tracking.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={handleConnectETrade} disabled={isConnecting}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect E*Trade"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Legacy E*Trade positions display */}
          {positions && positions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>E*Trade Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Symbol</th>
                        <th className="text-right p-3 font-medium">Shares</th>
                        <th className="text-right p-3 font-medium">Cost Basis</th>
                        <th className="text-right p-3 font-medium">Current</th>
                        <th className="text-right p-3 font-medium">Value</th>
                        <th className="text-right p-3 font-medium">Gain/Loss</th>
                        <th className="text-left p-3 font-medium">Vested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{position.symbol}</td>
                          <td className="p-3 text-right">{position.quantity}</td>
                          <td className="p-3 text-right">
                            ${position.cost_basis.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            ${position.current_price.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(position.current_value)}
                          </td>
                          <td
                            className={cn(
                              "p-3 text-right font-medium",
                              position.unrealized_gain >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            )}
                          >
                            {position.unrealized_gain >= 0 ? "+" : ""}
                            {formatCurrency(position.unrealized_gain)}
                          </td>
                          <td className="p-3">{formatDate(position.vesting_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
