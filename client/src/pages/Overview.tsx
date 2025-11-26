import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BarChart3, 
    ArrowUpRight, 
    MessageSquare, 
    Clock, 
    Smile, 
    Users,
    MoreHorizontal,
    Calendar,
    Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const data = [
  { name: 'Mon', messages: 40, response: 24 },
  { name: 'Tue', messages: 30, response: 13 },
  { name: 'Wed', messages: 55, response: 38 },
  { name: 'Thu', messages: 45, response: 28 },
  { name: 'Fri', messages: 60, response: 30 },
  { name: 'Sat', messages: 35, response: 15 },
  { name: 'Sun', messages: 25, response: 10 },
];

export function Overview() {
  const { activeClient, isLoadingClients } = useNexus();

  if (isLoadingClients) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-y-auto">
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Overview</h1>
            <p className="text-gray-500 mt-1">
              Welcome back! Here's what's happening with <span className="font-medium text-gray-900">{activeClient?.name || 'your workspace'}</span> today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Last 7 Days
            </Button>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <BarChart3 className="h-4 w-4" />
                Download Report
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Messages */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">2,350</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="text-emerald-600 flex items-center font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            +12.5%
                        </span>
                        from last week
                    </p>
                </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">12m 30s</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="text-emerald-600 flex items-center font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            -2.4%
                        </span>
                        improvement
                    </p>
                </CardContent>
            </Card>

            {/* Sentiment Score */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
                    <Smile className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">98.2%</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="text-emerald-600 flex items-center font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            +4.1%
                        </span>
                        positive interactions
                    </p>
                </CardContent>
            </Card>

             {/* Active Contacts */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">573</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="text-emerald-600 flex items-center font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            +24
                        </span>
                        new this week
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
            {/* Main Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Message Volume</CardTitle>
                    <CardDescription>Incoming messages vs responses over time</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="messages" 
                                    stroke="#6366f1" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorMessages)" 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="response" 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorResponse)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity / Feed */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions across your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {[
                            { user: "Alex M.", action: "closed ticket", target: "#2941", time: "2 mins ago", avatar: "AM" },
                            { user: "Sarah K.", action: "replied to", target: "Nike Order Inquiry", time: "15 mins ago", avatar: "SK" },
                            { user: "System", action: "synced contacts from", target: "HubSpot", time: "1 hour ago", avatar: "SYS" },
                            { user: "Mike R.", action: "assigned", target: "Refund Request", time: "2 hours ago", avatar: "MR" },
                            { user: "Alex M.", action: "added a note to", target: "VIP Client", time: "4 hours ago", avatar: "AM" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarFallback className="text-xs font-medium">{item.avatar}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        <span className="text-indigo-600">{item.user}</span> {item.action} <span className="font-medium">{item.target}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
