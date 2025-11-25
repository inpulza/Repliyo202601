import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  CheckCircle2, 
  MoreVertical, 
  LogOut, 
  RefreshCw,
  MessageSquare,
  MessageCircle,
  AlertCircle
} from "lucide-react";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube, 
  FaLinkedin 
} from "react-icons/fa";
import { mockSocialAccounts, SocialAccount } from '@/data/mockConnections';
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Connections() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(mockSocialAccounts);

  const handleDisconnect = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    toast({
      title: "Account Disconnected",
      description: "The social account has been removed.",
      variant: "destructive"
    });
  };

  const handleConnectMock = (platform: string) => {
    toast({
      title: "Connecting...",
      description: `Redirecting to ${platform} for authentication.`,
    });
    // Simulate connection flow
    setTimeout(() => {
        toast({
            title: "Success",
            description: `Connected to ${platform} successfully.`,
        });
    }, 1500);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <FaFacebook className="h-6 w-6 text-blue-600" />;
      case 'instagram': return <FaInstagram className="h-6 w-6 text-pink-600" />;
      case 'tiktok': return <FaTiktok className="h-6 w-6 text-black" />;
      case 'youtube': return <FaYoutube className="h-6 w-6 text-red-600" />;
      case 'linkedin': return <FaLinkedin className="h-6 w-6 text-blue-700" />;
      default: return <div className="h-6 w-6 bg-gray-200 rounded-full" />;
    }
  };

  const getPlatformName = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  return (
    <div className="h-full bg-background p-8 flex flex-col max-w-5xl mx-auto space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Social Accounts</h1>
        <p className="text-muted-foreground mt-1">Connect your social media profiles to start managing conversations.</p>
      </div>

      {/* Section A: Connect New Profile */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-500" />
          Connect New Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Facebook / Instagram */}
          <Card className="hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => handleConnectMock('Facebook/Instagram')}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="flex gap-2">
                <FaFacebook className="h-8 w-8 text-blue-600" />
                <FaInstagram className="h-8 w-8 text-pink-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Facebook & Instagram</h3>
                <p className="text-xs text-muted-foreground">Connect pages and business accounts</p>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200">
                Continue with Facebook
              </Button>
            </CardContent>
          </Card>

          {/* TikTok */}
          <Card className="hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => handleConnectMock('TikTok')}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <FaTiktok className="h-8 w-8 text-black" />
              <div className="space-y-1">
                <h3 className="font-medium">TikTok Business</h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-100">
                  Comments Only
                </Badge>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200">
                Connect TikTok
              </Button>
            </CardContent>
          </Card>

          {/* YouTube */}
          <Card className="hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => handleConnectMock('YouTube')}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <FaYoutube className="h-8 w-8 text-red-600" />
              <div className="space-y-1">
                <h3 className="font-medium">YouTube Channel</h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-100">
                  Comments Only
                </Badge>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200">
                Sign in with Google
              </Button>
            </CardContent>
          </Card>

          {/* LinkedIn */}
          <Card className="hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => handleConnectMock('LinkedIn')}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <FaLinkedin className="h-8 w-8 text-blue-700" />
              <div className="space-y-1">
                <h3 className="font-medium">LinkedIn Page</h3>
                <p className="text-xs text-muted-foreground">Company pages only</p>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200">
                Connect Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Section B: Active Connections */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Active Connections
          </h2>
          <Badge variant="outline" className="bg-gray-50">
            {accounts.length} Connected
          </Badge>
        </div>

        <div className="border rounded-lg bg-white divide-y">
          {accounts.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">
                <p>No active connections. Connect a profile above to get started.</p>
             </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={account.avatarUrl} />
                      <AvatarFallback>{account.accountName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border">
                        {getPlatformIcon(account.platform)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{account.accountName}</h3>
                      <Badge variant="outline" className="h-5 text-[10px] bg-green-50 text-green-700 border-green-200 gap-1 px-1.5">
                        <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Platform: <span className="font-medium text-foreground">{getPlatformName(account.platform)}</span>
                      </span>
                      <span>•</span>
                      <div className="flex gap-1">
                        {account.capabilities.comments && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1 font-normal bg-gray-100 hover:bg-gray-100 text-gray-600">
                            Comments
                          </Badge>
                        )}
                        {account.capabilities.dms && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1 font-normal bg-gray-100 hover:bg-gray-100 text-gray-600">
                            DMs
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                   <Button variant="ghost" size="sm" className="text-xs h-8">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Sync
                   </Button>
                   
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => handleDisconnect(account.id)}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
