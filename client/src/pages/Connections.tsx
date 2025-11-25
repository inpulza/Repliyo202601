import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  CheckCircle2, 
  MoreVertical, 
  LogOut, 
  RefreshCw,
  ExternalLink,
  LayoutGrid,
  List
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      case 'facebook': return <FaFacebook className={cn(size, "text-[#1877F2]")} />;
      case 'instagram': return <FaInstagram className={cn(size, "text-[#E4405F]")} />;
      case 'tiktok': return <FaTiktok className={cn(size, "text-black")} />;
      case 'youtube': return <FaYoutube className={cn(size, "text-[#FF0000]")} />;
      case 'linkedin': return <FaLinkedin className={cn(size, "text-[#0A66C2]")} />;
      case 'whatsapp': return <FaWhatsapp className={cn(size, "text-[#25D366]")} />;
      case 'google-business': return <GoogleBusinessIcon className={cn(size, "text-[#4285F4]")} />;
      case 'pinterest': return <FaPinterest className={cn(size, "text-[#BD081C]")} />;
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
        color: 'bg-[#1877F2]/10 text-[#1877F2]',
        icon: (
            <div className="flex items-center justify-center gap-2">
                <FaFacebook className="h-6 w-6 text-[#1877F2]" />
                <div className="w-px h-4 bg-current opacity-20" />
                <FaInstagram className="h-6 w-6 text-[#E4405F]" />
            </div>
        ),
        badge: 'Popular'
    },
    {
        id: 'google',
        name: 'Google Business',
        description: 'Manage reviews and Q&A',
        color: 'bg-blue-50 text-[#4285F4]',
        icon: <GoogleBusinessIcon className="h-8 w-8 text-[#4285F4]" />,
        badge: null
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Business API messaging',
        color: 'bg-[#25D366]/10 text-[#25D366]',
        icon: <FaWhatsapp className="h-8 w-8 text-[#25D366]" />,
        badge: null
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        description: 'Business accounts',
        color: 'bg-black/5 text-black',
        icon: <FaTiktok className="h-7 w-7 text-black" />,
        badge: null
    },
    {
        id: 'twitter',
        name: 'X / Twitter',
        description: 'Posts and mentions',
        color: 'bg-black/5 text-black',
        icon: <FaXTwitter className="h-7 w-7 text-black" />,
        badge: null
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Company pages',
        color: 'bg-[#0A66C2]/10 text-[#0A66C2]',
        icon: <FaLinkedin className="h-8 w-8 text-[#0A66C2]" />,
        badge: null
    },
    {
        id: 'youtube',
        name: 'YouTube',
        description: 'Channel comments',
        color: 'bg-[#FF0000]/10 text-[#FF0000]',
        icon: <FaYoutube className="h-8 w-8 text-[#FF0000]" />,
        badge: null
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        description: 'Business boards',
        color: 'bg-[#BD081C]/10 text-[#BD081C]',
        icon: <FaPinterest className="h-8 w-8 text-[#BD081C]" />,
        badge: null
    }
  ];

  return (
    <div className="h-full bg-background p-6 md:p-10 flex flex-col max-w-7xl mx-auto space-y-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Connections</h1>
          <p className="text-muted-foreground text-base">
            Manage your social profiles and connected channels.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8 px-2.5"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8 px-2.5"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Active Connections Section */}
      {accounts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Active Connections
              <span className="ml-2 text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {accounts.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const capabilities = account.capabilities as any;
              return (
                <Card key={account.id} className="group border-border bg-card transition-colors hover:border-primary/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={account.avatarUrl} />
                            <AvatarFallback className="bg-primary/5 text-primary font-semibold rounded-md">
                              {account.accountName.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-background rounded-md p-1 border border-border">
                            {getPlatformIcon(account.platform, "h-3.5 w-3.5")}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{account.accountName}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{getPlatformName(account.platform)}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDisconnect(account.id)}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                       <div className="inline-flex items-center text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                          Connected
                       </div>
                       {capabilities.dms && <div className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">Messages</div>}
                       {capabilities.comments && <div className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">Comments</div>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Separator className="my-8" />

      {/* Available Channels Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
            Available Channels
            </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {socialPlatforms.map((platform) => (
            <Card 
                key={platform.id} 
                className={cn(
                    "group relative overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-200 flex flex-col h-full",
                    isConnecting === platform.name ? "ring-2 ring-primary ring-offset-2" : ""
                )}
            >
                <CardContent className="p-6 flex flex-col items-center text-center gap-4 flex-1">
                    <div className={cn("p-4 rounded-xl transition-colors", platform.color)}>
                        {platform.icon}
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2">
                            <h3 className="font-semibold text-foreground">{platform.name}</h3>
                            {platform.badge && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md">
                                    {platform.badge}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {platform.description}
                        </p>
                    </div>
                </CardContent>
                
                <CardFooter className="p-3 bg-muted/20 border-t border-border group-hover:bg-muted/40 transition-colors mt-auto">
                    <Button 
                        variant="ghost" 
                        className="w-full hover:bg-background hover:text-primary border border-transparent hover:border-border transition-all duration-200"
                        onClick={() => handleConnectMock(platform.name)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Connect
                    </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
