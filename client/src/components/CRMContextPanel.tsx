import React, { useState } from 'react';
import { CRMContact } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

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

function CRMPanelContent({ contact, onClose, className }: { contact?: CRMContact, onClose: () => void, className?: string }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCreateDialogOpen(false);
      toast.success("Contact created in CRM", {
        description: "The contact has been successfully synced."
      });
    }, 1500);
  };

  const handleAddDeal = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setTimeout(() => {
          setIsSubmitting(false);
          setIsAddDealOpen(false);
          toast.success("Deal Created", { description: "New deal added to pipeline." });
      }, 1000);
  };

  const handleAddNote = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setTimeout(() => {
          setIsSubmitting(false);
          setIsAddNoteOpen(false);
          toast.success("Note Added", { description: "Note saved to contact timeline." });
      }, 1000);
  };

  if (!contact) {
    return (
       <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden", className)}>
          {/* Header */}
          <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-10">
             <span className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> CRM Context
             </span>
             <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
             </Button>
          </div>

          {/* Empty State Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-0">
             <div className="bg-white p-4 rounded-2xl mb-6 ring-1 ring-gray-200 relative group border border-gray-200">
                <div className="absolute -top-2 -right-2 bg-red-500 h-4 w-4 rounded-full border-2 border-white animate-pulse" />
                <div className="bg-indigo-50 p-3 rounded-xl">
                    <Plus className="h-8 w-8 text-indigo-600" />
                </div>
             </div>
             
             <h3 className="text-lg font-bold text-gray-900 mb-2">New Prospect</h3>
             <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-[240px]">
                This contact is not synchronized with your CRM yet. Capture this opportunity!
             </p>
             
             <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Contact in CRM
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Contact</DialogTitle>
                    <DialogDescription>
                      Add this prospect to your CRM. Fill in the details below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateContact}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input id="name" defaultValue="Alex Johnson" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input id="email" defaultValue="alex@example.com" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company" className="text-right">
                          Company
                        </Label>
                        <Input id="company" defaultValue="Acme Inc." className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Contact"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>

             <p className="text-[10px] text-gray-400 mt-6">
                Syncs with HubSpot, Salesforce & more
             </p>
          </div>
       </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out", className)}>
      {/* Header */}
      <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {contact.crmType === 'hubspot' && <img src="/logos/hubspot.png" alt="HubSpot" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'salesforce' && <img src="https://logo.clearbit.com/salesforce.com" alt="Salesforce" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'pipedrive' && <img src="/logos/pipedrive.webp" alt="Pipedrive" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'zoho' && <img src="/logos/zoho.png" alt="Zoho" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'monday' && <img src="https://logo.clearbit.com/monday.com" alt="Monday" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'notion' && <img src="https://logo.clearbit.com/notion.so" alt="Notion" className="h-4 w-auto object-contain" />}
            {contact.crmType === 'airtable' && <img src="https://logo.clearbit.com/airtable.com" alt="Airtable" className="h-4 w-auto object-contain" />}
            
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
                    <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                                <Plus className="h-3 w-3" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Deal</DialogTitle>
                                <DialogDescription>Create a new opportunity for this contact.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddDeal} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Deal Name</Label>
                                    <Input placeholder="e.g. Enterprise License Q4" defaultValue="New Opportunity" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Value ($)</Label>
                                    <Input type="number" placeholder="0.00" defaultValue="5000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stage</Label>
                                    <Input defaultValue="Discovery" disabled className="bg-gray-50" />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Deal"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="overflow-hidden border border-gray-200">
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
                    <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                                <Plus className="h-3 w-3" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Note</DialogTitle>
                                <DialogDescription>Log a call, meeting, or thought.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddNote} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Note Content</Label>
                                    <textarea 
                                        className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Type your note here..."
                                        defaultValue="Spoke with the client, they are interested in the Q4 plan."
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Note"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
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

export function CRMContextPanel({ contact, isOpen, onClose }: CRMContextPanelProps) {
  const isMobile = useIsMobile();

  if (!isOpen && !isMobile) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[85vh] outline-none">
           <div className="h-full overflow-hidden flex flex-col bg-white rounded-t-[10px]">
              <CRMPanelContent contact={contact} onClose={onClose} className="bg-white" />
           </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className={cn(
        "w-[320px] border-l flex flex-col h-full shrink-0 z-30 transition-all duration-300 ease-in-out",
        "bg-white"
    )}>
       <CRMPanelContent contact={contact} onClose={onClose} className="bg-white" />
    </div>
  );
}
