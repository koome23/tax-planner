"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Settings,
  Link as LinkIcon,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [etradeStatus, setEtradeStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [email, setEmail] = useState("");
  const [testEmailSent, setTestEmailSent] = useState(false);

  const testEmailMutation = useMutation({
    mutationFn: (email: string) => api.testNotification(email),
    onSuccess: () => setTestEmailSent(true),
  });

  const handleConnectETrade = async () => {
    setEtradeStatus("connecting");
    try {
      const { auth_url } = await api.getEtradeAuthUrl();

      // Open OAuth popup
      const popup = window.open(auth_url, "etrade_auth", "width=600,height=700");

      // Poll for OAuth completion
      const checkInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkInterval);
          // In a real app, we'd check if OAuth completed successfully
          setEtradeStatus("connected");
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to connect E*Trade:", error);
      setEtradeStatus("disconnected");
    }
  };

  const handleDisconnectETrade = () => {
    setEtradeStatus("disconnected");
  };

  const handleTestEmail = () => {
    if (email) {
      testEmailMutation.mutate(email);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your tax planner preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Filing Status</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <span className="font-medium">Married Filing Jointly</span>
                </div>
              </div>
              <div>
                <Label>Tax Year</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <span className="font-medium">2025</span>
                </div>
              </div>
            </div>

            <div>
              <Label>State Residency</Label>
              <div className="mt-1 grid gap-2 md:grid-cols-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 dark:border dark:border-blue-800 rounded-md">
                  <span className="font-medium">Primary: California</span>
                  <p className="text-sm text-muted-foreground dark:text-blue-200/80">
                    Progressive rates up to 13.3%
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 dark:border dark:border-green-800 rounded-md">
                  <span className="font-medium">Secondary: Oklahoma</span>
                  <p className="text-sm text-muted-foreground dark:text-green-200/80">
                    Progressive rates up to 4.75%
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>2025 Tax Limits</Label>
              <div className="mt-2 grid gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Social Security Wage Base</span>
                  <span className="font-medium">$176,100</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>401(k) Elective Deferral Limit</span>
                  <span className="font-medium">$23,500</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>401(k) Catch-Up (50+)</span>
                  <span className="font-medium">$7,500</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              E*Trade Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                {etradeStatus === "connected" ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : etradeStatus === "connecting" ? (
                  <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                ) : (
                  <XCircle className="h-6 w-6 text-gray-400 dark:text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {etradeStatus === "connected"
                      ? "Connected to E*Trade"
                      : etradeStatus === "connecting"
                      ? "Connecting..."
                      : "Not Connected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {etradeStatus === "connected"
                      ? "RSU data will sync automatically"
                      : "Connect to import RSU positions"}
                  </p>
                </div>
              </div>
              {etradeStatus === "connected" ? (
                <Button variant="outline" onClick={handleDisconnectETrade}>
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleConnectETrade}
                  disabled={etradeStatus === "connecting"}
                >
                  {etradeStatus === "connecting" ? "Connecting..." : "Connect"}
                </Button>
              )}
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 dark:border dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-muted-foreground dark:text-yellow-200/80">
                <strong>Note:</strong> E*Trade API access requires approval. You
                will need your E*Trade consumer key and secret configured in the
                application settings.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notification-email">Notification Email</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={!email || testEmailMutation.isPending}
                >
                  {testEmailMutation.isPending ? "Sending..." : "Test"}
                </Button>
              </div>
              {testEmailSent && (
                <p className="text-sm text-green-600 mt-1">
                  Test email sent successfully!
                </p>
              )}
            </div>

            <div>
              <Label>Notification Preferences</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    Quarterly payment reminders (7 days before due date)
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    RSU vest notifications (day of vest)
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    Year-end tax projection summary (December)
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    Weekly tax withholding summary
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Export All Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your paystubs and tax data as JSON
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 dark:bg-red-950/20 rounded-lg">
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">Delete All Data</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all stored paystubs and settings
                </p>
              </div>
              <Button variant="destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
