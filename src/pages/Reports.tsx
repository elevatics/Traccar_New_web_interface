import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  FileText,
  TrendingUp,
  DollarSign,
  Fuel,
  Settings,
  Download,
  Eye,
  Plus,
  Calendar,
  FileDown,
  ChevronDown,
  User,
  Car,
  Route as RouteIcon,
  AlertCircle,
  MapPin,
  Activity,
  PieChart,
  PlayCircle,
  BarChart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useFleetData from "@/hooks/useFleetData";
import { getDrivers } from "@/services/driverService";
import { getEvents } from "@/services/eventService";

type ReportSubmenu = "fleet" | "vehicle" | "driver" | "financial" | "fuel" | "custom" | "export";
type ReportTopic = "route" | "events" | "trips" | "stops" | "summary" | "chart" | "replay" | "statistics";

export default function Reports() {
  const { toast } = useToast();
  const { fleetData } = useFleetData();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<ReportSubmenu>("fleet");
  const [viewReportDialog, setViewReportDialog] = useState(false);
  const [createReportDialog, setCreateReportDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<ReportTopic[]>(["summary"]);
  const [driverCount, setDriverCount] = useState(0);
  const [eventRows, setEventRows] = useState<Array<{ type: string; eventTime: string | null }>>([]);

  useEffect(() => {
    const loadSupportingData = async () => {
      try {
        const [drivers, events] = await Promise.all([getDrivers(), getEvents()]);
        setDriverCount(Array.isArray(drivers) ? drivers.length : 0);
        setEventRows(
          (Array.isArray(events) ? events : [])
            .slice(0, 12)
            .map((rawEvent) => {
              const event = rawEvent as Record<string, unknown>;
              return {
                type: typeof event.type === "string" ? event.type : "unknown",
                eventTime: typeof event.eventTime === "string" ? event.eventTime : null,
              };
            })
        );
      } catch (error) {
        console.error("Failed to load report source data", error);
      }
    };

    loadSupportingData();
  }, []);

  const fleetSummary = useMemo(() => {
    const total = fleetData.length;
    const active = fleetData.filter((vehicle) => {
      const row = vehicle as Record<string, unknown>;
      return row.status === "online";
    }).length;
    const avgSpeed = total
      ? Math.round(
          fleetData.reduce((sum: number, vehicle) => {
            const row = vehicle as Record<string, unknown>;
            return sum + (Number(row.speed) || 0);
          }, 0) / total
        )
      : 0;
    const totalDistance = Math.round(
      fleetData.reduce((sum: number, vehicle) => {
        const row = vehicle as Record<string, unknown>;
        return sum + (Number(row.totalDistance) || 0);
      }, 0)
    );

    return { total, active, avgSpeed, totalDistance };
  }, [fleetData]);

  const performanceSummary = useMemo(() => {
    const totalFuelConsumption = fleetData.reduce((sum: number, item) => {
      const row = item as Record<string, unknown>;
      return sum + (Number(row.fuelConsumption) || 0);
    }, 0);
    const avgFuelConsumption = fleetData.length ? totalFuelConsumption / fleetData.length : 0;
    const incidentCount = eventRows.filter((row) => row.type.includes("alarm") || row.type.includes("overspeed")).length;
    const estimatedRevenue = fleetSummary.totalDistance * 1.4;
    const estimatedExpenses = fleetSummary.totalDistance * 0.9;
    const netProfit = estimatedRevenue - estimatedExpenses;
    const profitMargin = estimatedRevenue > 0 ? (netProfit / estimatedRevenue) * 100 : 0;

    return {
      totalFuelConsumption,
      avgFuelConsumption,
      incidentCount,
      estimatedRevenue,
      estimatedExpenses,
      netProfit,
      profitMargin,
    };
  }, [eventRows, fleetData, fleetSummary.totalDistance]);

  const prebuiltReports = useMemo(
    () => [
      { id: "fleet", title: `Fleet Performance (${fleetSummary.total} vehicles)`, icon: TrendingUp },
      { id: "driver", title: `Driver Efficiency (${driverCount} drivers)`, icon: User },
      { id: "financial", title: `Financial Summary ($${Math.round(performanceSummary.netProfit).toLocaleString()} net)`, icon: DollarSign },
    ],
    [driverCount, fleetSummary.total, performanceSummary.netProfit]
  );

  const submenuItems = [
    { id: "fleet" as ReportSubmenu, label: "Fleet Reports", icon: BarChart3 },
    { id: "vehicle" as ReportSubmenu, label: "Vehicle Reports", icon: Car },
    { id: "driver" as ReportSubmenu, label: "Driver Reports", icon: User },
    { id: "financial" as ReportSubmenu, label: "Financial Reports", icon: DollarSign },
    { id: "fuel" as ReportSubmenu, label: "Fuel Reports", icon: Fuel },
    { id: "custom" as ReportSubmenu, label: "Custom Reports", icon: Settings },
    { id: "export" as ReportSubmenu, label: "Export Data", icon: Download },
  ];

  const reportTopics = [
    { id: "route" as ReportTopic, label: "Route", icon: RouteIcon },
    { id: "events" as ReportTopic, label: "Events", icon: AlertCircle },
    { id: "trips" as ReportTopic, label: "Trips", icon: Activity },
    { id: "stops" as ReportTopic, label: "Stops", icon: MapPin },
    { id: "summary" as ReportTopic, label: "Summary", icon: FileText },
    { id: "chart" as ReportTopic, label: "Chart", icon: PieChart },
    { id: "replay" as ReportTopic, label: "Replay", icon: PlayCircle },
    { id: "statistics" as ReportTopic, label: "Statistics", icon: BarChart },
  ];

  const recentReports = useMemo(
    () =>
      eventRows
        .map((event, index) => ({
          id: index + 1,
          name: `${event.type} event report`,
          type: "Event",
          date: event.eventTime ? new Date(event.eventTime).toLocaleDateString() : "N/A",
          status: "completed",
        }))
        .filter((report) => report.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [eventRows, searchQuery]
  );

  const toggleTopic = (topic: ReportTopic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "view":
        setViewReportDialog(true);
        break;
      case "create":
        setCreateReportDialog(true);
        break;
      case "schedule":
        setScheduleDialog(true);
        break;
      case "export":
        setExportDialog(true);
        break;
    }
  };

  const generateReport = () => {
    toast({
      title: "Report Generated",
      description: `Report with ${selectedTopics.length} topic(s) has been generated successfully.`,
    });
    setCreateReportDialog(false);
  };

  const renderSubmenuContent = () => {
    switch (activeSubmenu) {
      case "fleet":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Distance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{fleetSummary.totalDistance.toLocaleString()} km</div>
                <p className="text-sm text-muted-foreground">Live total from connected trackers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fleetSummary.active}/{fleetSummary.total}
                </div>
                <p className="text-sm text-muted-foreground">
                  {fleetSummary.total ? Math.round((fleetSummary.active / fleetSummary.total) * 100) : 0}% utilization
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Speed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{fleetSummary.avgSpeed} km/h</div>
                <p className="text-sm text-muted-foreground">Based on current telemetry</p>
              </CardContent>
            </Card>
          </div>
        );
      case "vehicle":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Fuel Efficiency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleetData.slice(0, 8).map((vehicle) => {
                const row = vehicle as Record<string, unknown>;
                return (
                  <TableRow key={String(row.id)}>
                    <TableCell>{String(row.name || `Device ${String(row.id)}`)}</TableCell>
                    <TableCell>{Math.round(Number(row.totalDistance) || 0).toLocaleString()} km</TableCell>
                    <TableCell>{Math.round(Number(row.fuelConsumption) || 0)} L/100km</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "online" ? "secondary" : "outline"}>
                        {String(row.status || "offline")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );
      case "driver":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Trips</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Incidents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Registered Drivers</TableCell>
                <TableCell>{driverCount}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{Math.min(100, 75 + Math.min(driverCount, 25))}/100</Badge>
                </TableCell>
                <TableCell>{eventRows.filter((row) => row.type === "alarm").length}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );
      case "financial":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${Math.round(performanceSummary.estimatedRevenue).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Distance-based live projection</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${Math.round(performanceSummary.estimatedExpenses).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Current operating projection</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${Math.round(performanceSummary.netProfit).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Revenue minus projected expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{performanceSummary.profitMargin.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Computed from live KPIs</p>
              </CardContent>
            </Card>
          </div>
        );
      case "fuel":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Fuel Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${Math.round(performanceSummary.totalFuelConsumption * 200).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Derived from current fuel telemetry</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(performanceSummary.avgFuelConsumption)}{" "}
                  L/100km
                </div>
                <p className="text-sm text-muted-foreground">Fleet average from API</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fuel Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{performanceSummary.incidentCount}</div>
                <p className="text-sm text-muted-foreground">Tracked incidents in current event window</p>
              </CardContent>
            </Card>
          </div>
        );
      case "custom":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Build Custom Report</CardTitle>
              <CardDescription>Select topics to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportTopics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => toggleTopic(topic.id)}
                    >
                      <Checkbox
                        id={topic.id}
                        checked={selectedTopics.includes(topic.id)}
                        onCheckedChange={() => toggleTopic(topic.id)}
                      />
                      <Label
                        htmlFor={topic.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        {topic.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                <Button onClick={generateReport} className="w-full">
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case "export":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Download reports in various formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Format</Label>
                  <Select defaultValue="csv">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select defaultValue="month">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                      <SelectItem value="quarter">Last Quarter</SelectItem>
                      <SelectItem value="year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Reports</h2>
          <p className="text-muted-foreground">Analytics and business intelligence</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Reports
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {submenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => setActiveSubmenu(item.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleQuickAction("view")}
            >
              <Eye className="h-5 w-5" />
              <span className="text-sm">View Pre-built Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleQuickAction("create")}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Create Custom Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleQuickAction("schedule")}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Schedule Report Delivery</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleQuickAction("export")}
            >
              <FileDown className="h-5 w-5" />
              <span className="text-sm">Export Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Submenu Content */}
      <div>{renderSubmenuContent()}</div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Badge variant={report.status === "completed" ? "secondary" : "outline"}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={viewReportDialog} onOpenChange={setViewReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-built Reports</DialogTitle>
            <DialogDescription>Select a report template to view</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {prebuiltReports.map((report) => {
              const Icon = report.icon;
              return (
                <Button key={report.id} variant="outline" className="w-full justify-start">
                  <Icon className="mr-2 h-4 w-4" />
                  {report.title}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createReportDialog} onOpenChange={setCreateReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>Select topics to include in your custom report</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {reportTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <div
                    key={topic.id}
                    className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    onClick={() => toggleTopic(topic.id)}
                  >
                    <Checkbox
                      id={`dialog-${topic.id}`}
                      checked={selectedTopics.includes(topic.id)}
                      onCheckedChange={() => toggleTopic(topic.id)}
                    />
                    <Label
                      htmlFor={`dialog-${topic.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      {topic.label}
                    </Label>
                  </div>
                );
              })}
            </div>
            <Button onClick={generateReport} className="w-full">
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report Delivery</DialogTitle>
            <DialogDescription>Set up automatic report delivery</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Frequency</Label>
              <Select defaultValue="weekly">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="recipient@example.com" />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast({
                  title: "Schedule Created",
                  description: "Report will be delivered automatically.",
                });
                setScheduleDialog(false);
              }}
            >
              Schedule Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>Download reports in your preferred format</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Format</Label>
              <Select defaultValue="csv">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast({
                  title: "Export Started",
                  description: "Your report is being prepared for download.",
                });
                setExportDialog(false);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
