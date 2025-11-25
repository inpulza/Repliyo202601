import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle,
  ExternalLink,
  Settings2
} from "lucide-react";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube, 
  FaLinkedin,
  FaWhatsapp,
  FaPinterest,
  FaGoogle,
  FaXTwitter
} from "react-icons/fa6";
import { mockSocialAccounts, SocialAccount } from '@/data/mockConnections';
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Connections() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(mockSocialAccounts);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleDisconnect = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    toast({
      title: "Account Disconnected",
      description: "The social account has been removed.",
      variant: "destructive"
    });
  };

  const handleConnectMock = (platform: string) => {
    setIsConnecting(platform);
    toast({
      title: "Connecting...",
      description: `Redirecting to ${platform} for authentication.`,
    });
    // Simulate connection flow
    setTimeout(() => {
        setIsConnecting(null);
        toast({
            title: "Success",
            description: `Connected to ${platform} successfully.`,
        });
    }, 1500);
  };

  const getPlatformIcon = (platform: string, size: string = "h-5 w-5") => {
    switch (platform) {
      case 'facebook': return <FaFacebook className={cn(size, "text-blue-600")} />;
      case 'instagram': return <FaInstagram className={cn(size, "text-pink-600")} />;
      case 'tiktok': return <FaTiktok className={cn(size, "text-black")} />;
      case 'youtube': return <FaYoutube className={cn(size, "text-red-600")} />;
      case 'linkedin': return <FaLinkedin className={cn(size, "text-blue-700")} />;
      case 'whatsapp': return <FaWhatsapp className={cn(size, "text-green-500")} />;
      case 'google-business': return <FaGoogle className={cn(size, "text-blue-500")} />;
      case 'pinterest': return <FaPinterest className={cn(size, "text-red-500")} />;
      case 'twitter': return <FaXTwitter className={cn(size, "text-black")} />;
      default: return <div className={cn(size, "bg-gray-200 rounded-full")} />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
        case 'google-business': return 'Google Business';
        case 'whatsapp': return 'WhatsApp Business';
        default: return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  const socialPlatforms = [
    {
        id: 'meta',
        name: 'Facebook & Instagram',
        description: 'Connect pages and business accounts',
        icon: (
            <div className="flex -space-x-2">
                <div className="bg-white rounded-full p-1 shadow-sm z-10">
                    <FaFacebook className="h-6 w-6 text-blue-600" />
                </div>
                <div className="bg-white rounded-full p-1 shadow-sm">
                    <FaInstagram className="h-6 w-6 text-pink-600" />
                </div>
            </div>
        ),
        badge: null
    },
    {
        id: 'google',
        name: 'Google Business',
        description: 'Manage reviews and Q&A',
        icon: <FaGoogle className="h-8 w-8 text-blue-500" />,
        badge: null
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Business API messaging',
        icon: <FaWhatsapp className="h-8 w-8 text-green-500" />,
        badge: null
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        description: 'Business accounts',
        icon: <FaTiktok className="h-8 w-8 text-black" />,
        badge: 'Comments'
    },
    {
        id: 'twitter',
        name: 'X / Twitter',
        description: 'Posts and mentions',
        icon: <FaXTwitter className="h-8 w-8 text-black" />,
        badge: null
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Company pages',
        icon: <FaLinkedin className="h-8 w-8 text-blue-700" />,
        badge: null
    },
    {
        id: 'youtube',
        name: 'YouTube',
        description: 'Channel comments',
        icon: <FaYoutube className="h-8 w-8 text-red-600" />,
        badge: 'Comments'
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        description: 'Business boards',
        icon: <FaPinterest className="h-8 w-8 text-red-500" />,
        badge: null
    }
  ];

  return (
    <div className="h-full bg-gray-50/30 p-6 md:p-10 flex flex-col max-w-6xl mx-auto space-y-10 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Social Accounts</h1>
        <p className="text-muted-foreground mt-2 text-base">Manage your connected social profiles and messaging channels.</p>
      </div>

      {/* Section A: Connect New Profile */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <Plus className="h-5 w-5 text-indigo-600" />
            Connect New Channel
            </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {socialPlatforms.map((platform) => (
            <Card 
                key={platform.id} 
                className={cn(
                    "group relative overflow-hidden border-muted/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-pointer bg-white",
                    isConnecting === platform.name ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                )}
                onClick={() => handleConnectMock(platform.name)}
            >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4 text-indigo-400" />
                </div>
                <CardContent className="flex flex-col items-start p-6 space-y-4 h-full">
                    <div className="p-2 bg-gray-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        {platform.icon}
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                            {platform.badge && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-100/50">
                                    {platform.badge}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{platform.description}</p>
                    </div>
                    <div className="mt-auto pt-2 w-full">
                         <Button variant="ghost" className="w-full justify-start px-0 text-indigo-600 hover:text-indigo-700 hover:bg-transparent text-xs font-medium group-hover:translate-x-1 transition-transform">
                            Connect {platform.name.split(' ')[0]} →
                         </Button>
                    </div>
                </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="bg-gray-200" />

      {/* Section B: Active Connections */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Active Connections
          </h2>
          <Badge variant="outline" className="bg-white shadow-sm px-3 py-1">
            {accounts.length} Connected
          </Badge>
        </div>

        <div className="bg-white border rounded-xl shadow-sm divide-y overflow-hidden">
          {accounts.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground bg-gray-50/50">
                <p>No active connections. Connect a profile above to get started.</p>
             </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-gray-50/80 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                      <AvatarImage src={account.avatarUrl} />
                      <AvatarFallback className="bg-indigo-50 text-indigo-700 font-semibold">
                        {account.accountName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border">
                        {getPlatformIcon(account.platform, "h-4 w-4")}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm text-gray-900">{account.accountName}</h3>
                      <Badge variant="outline" className="h-5 text-[10px] bg-green-50 text-green-700 border-green-200 gap-1.5 px-2 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-gray-600">{getPlatformName(account.platform)}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex gap-1.5">
                        {(account.capabilities as any).reviews && (
                           <Badge variant="secondary" className="h-4 text-[9px] px-1.5 font-normal bg-gray-100 hover:bg-gray-200 text-gray-600 border-0">
                             Reviews
                           </Badge>
                        )}
                        {account.capabilities.comments && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1.5 font-normal bg-gray-100 hover:bg-gray-200 text-gray-600 border-0">
                            Comments
                          </Badge>
                        )}
                        {account.capabilities.dms && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1.5 font-normal bg-gray-100 hover:bg-gray-200 text-gray-600 border-0">
                            DMs
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-14 sm:pl-0">
                   <Button variant="outline" size="sm" className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-200 font-normal hidden sm:flex">
                      <RefreshCw className="h-3.5 w-3.5 mr-2 text-gray-500" />
                      Sync Now
                   </Button>
                   
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="cursor-pointer">
                        <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
                        Sync Data
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <ExternalLink className="h-4 w-4 mr-2 text-gray-500" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50" onClick={() => handleDisconnect(account.id)}>
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
