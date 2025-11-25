import React from 'react';
import { CRMContact } from '@/lib/mockData';
import { 
  Building2, 
  Mail, 
  Phone, 
  ExternalLink, 
  Briefcase, 
  DollarSign, 
  StickyNote, 
  Plus,
  X,
  ChevronsRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CRMContextPanelProps {
  contact?: CRMContact;
  isOpen: boolean;
  onClose: () => void;
}

const DealStageBadge = ({ stage }: { stage: CRMContact['dealStage'] }) => {
  const colors = {
    'New': 'bg-blue-100 text-blue-700',
    'Discovery': 'bg-purple-100 text-purple-700',
    'Negotiation': 'bg-orange-100 text-orange-700',
    'Closed Won': 'bg-green-100 text-green-700',
  };

  return (
    <Badge variant="secondary" className={cn("text-[10px] font-medium px-1.5 py-0 h-5", colors[stage])}>
      {stage}
    </Badge>
  );
};

export function CRMContextPanel({ contact, isOpen, onClose }: CRMContextPanelProps) {
  if (!isOpen) return null;

  if (!contact) {
    return (
       <div className="w-[300px] border-l bg-gray-50/50 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out">
          <div className="p-4 border-b flex items-center justify-between bg-white">
             <span className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> CRM Context
             </span>
             <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                <ChevronsRight className="h-4 w-4 text-gray-400" />
             </Button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
             <div className="bg-gray-100 p-3 rounded-full mb-3">
                <Briefcase className="h-6 w-6 text-gray-400" />
             </div>
             <p className="text-sm font-medium text-gray-900">No CRM Data Found</p>
             <p className="text-xs mt-1 text-gray-500">This contact is not linked to any CRM record.</p>
             <Button size="sm" variant="outline" className="mt-4 text-xs h-8">
                Create Contact
             </Button>
          </div>
       </div>
    );
  }

  return (
    <div className="w-[320px] border-l bg-white flex flex-col h-full shrink-0 shadow-xl z-30 transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <img 
                src={contact.crmType === 'hubspot' ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/HubSpot_Logo.svg/2560px-HubSpot_Logo.svg.png' : ''} 
                alt={contact.crmType}
                className="h-4 w-auto object-contain"
            />
            <span className="capitalize">Profile</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
           <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
            {/* Profile Section */}
            <div className="flex flex-col items-center text-center">
                <Avatar className="h-16 w-16 mb-3 ring-4 ring-gray-50">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl font-bold">
                        {contact.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-lg text-gray-900 truncate max-w-full px-2">{contact.email}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3" /> {contact.company}
                </p>
                
                <Button variant="outline" size="sm" className="mt-4 w-full text-xs gap-1 h-8 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700" asChild>
                    <a href={contact.profileUrl} target="_blank" rel="noreferrer">
                        View in {contact.crmType} <ExternalLink className="h-3 w-3" />
                    </a>
                </Button>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h4>
                
                <div className="flex items-center gap-3 text-sm group">
                    <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-gray-900 truncate">{contact.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-sm group">
                    <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-gray-900">{contact.phone}</p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Deals Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Deals</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                <Card className="shadow-sm border-l-4 border-l-indigo-500 overflow-hidden">
                    <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                            <h5 className="text-sm font-semibold text-gray-900 leading-tight">Enterprise License 2024</h5>
                            <DealStageBadge stage={contact.dealStage} />
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 font-medium text-sm">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                            {contact.dealValue.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Notes Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Notes</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3 relative">
                    <StickyNote className="absolute top-3 right-3 h-3 w-3 text-yellow-400 opacity-50" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                        "{contact.lastNote}"
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">Updated today</p>
                </div>
            </div>
        </div>
      </ScrollArea>
    </div>
  );
}
