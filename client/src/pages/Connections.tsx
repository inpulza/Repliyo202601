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
  FaXTwitter
} from "react-icons/fa6";
import { GoogleBusinessIcon } from "@/components/GoogleBusinessIcon";
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
      case 'google-business': return <GoogleBusinessIcon className={cn(size, "text-blue-500")} />;
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
        icon: <GoogleBusinessIcon className="h-8 w-8 text-blue-500" />,
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
    <div className="h-full bg-gray-50/30 p-6 md:p-8 flex flex-col max-w-5xl mx-auto space-y-6 overflow-y-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Social Accounts</h1>
        <p className="text-muted-foreground text-sm">Manage your connected social profiles and messaging channels.</p>
      </div>

      {/* Section A: Connect New Profile */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <Plus className="h-4 w-4 text-indigo-600" />
            Connect New Channel
            </h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {socialPlatforms.map((platform) => (
            <Card 
                key={platform.id} 
                className={cn(
                    "group relative overflow-hidden border-muted/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-pointer bg-white",
                    isConnecting === platform.name ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                )}
                onClick={() => handleConnectMock(platform.name)}
            >
                <CardContent className="flex flex-col p-3 gap-1.5 h-24 justify-between">
                    <div className="flex items-start justify-between w-full">
                         <div className="shrink-0 p-1.5 bg-gray-50 rounded-lg group-hover:scale-105 transition-transform duration-300">
                            {React.cloneElement(platform.icon as React.ReactElement<any>, { className: "h-5 w-5" })}
                        </div>
                         {platform.badge && (
                             <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-100/50">
                                 {platform.badge}
                             </Badge>
                         )}
                    </div>
                   
                    <div className="flex flex-col min-w-0 mt-1">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-gray-900 truncate">{platform.name}</span>
                        </div>
                         <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                            {platform.description}
                        </p>
                    </div>
                </CardContent>
                
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                     <ExternalLink className="h-3 w-3 text-indigo-400" />
                </div>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="bg-gray-200" />

      {/* Section B: Active Connections */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Active Connections
          </h2>
          <Badge variant="outline" className="bg-white shadow-sm px-2 py-0.5 text-xs font-normal">
            {accounts.length} Connected
          </Badge>
        </div>

        <div className="bg-white border rounded-lg shadow-sm divide-y overflow-hidden">
          {accounts.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground bg-gray-50/50">
                <p className="text-sm">No active connections.</p>
             </div>
          ) : (
            accounts.map((account) => {
              const capabilities = account.capabilities as any; // Cast to any to allow optional properties access safely in render
              return (
              <div key={account.id} className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                      <AvatarImage src={account.avatarUrl} />
                      <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {account.accountName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border">
                        {getPlatformIcon(account.platform, "h-3 w-3")}
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{account.accountName}</span>
                      <Badge variant="outline" className="h-4 text-[9px] bg-green-50 text-green-700 border-green-200 gap-1 px-1.5 font-medium">
                        <span className="h-1 w-1 rounded-full bg-green-500" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium text-gray-500">{getPlatformName(account.platform)}</span>
                      {(capabilities.comments || capabilities.dms || capabilities.reviews) && (
                        <>
                            <span className="text-gray-300">•</span>
                            <div className="flex gap-1">
                                {capabilities.reviews && <span>Reviews</span>}
                                {capabilities.reviews && (capabilities.comments || capabilities.dms) && <span>&</span>}
                                {capabilities.comments && <span>Comments</span>}
                                {capabilities.comments && capabilities.dms && !capabilities.reviews && <span>&</span>}
                                {capabilities.dms && <span>DMs</span>}
                            </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                   <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:flex">
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Sync
                   </Button>
                   
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-900">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer text-xs">
                        <RefreshCw className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        Sync Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 cursor-pointer text-xs focus:text-red-700 focus:bg-red-50" onClick={() => handleDisconnect(account.id)}>
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
            );
           })
          )}
        </div>
      </section>
    </div>
  );
}
