"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";

import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Copy, Check, Link, Globe, Lock } from "lucide-react";

interface ShareDialogProps {
  documentId: Id<"documents">;
  children: React.ReactNode;
}

export const ShareDialog = ({ documentId, children }: ShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const document = useQuery(api.documents.getById, { id: documentId });
  const enableSharing = useMutation(api.documents.enablePublicSharing);
  const disableSharing = useMutation(api.documents.disablePublicSharing);
  const updateAccessType = useMutation(api.documents.updatePublicAccessType);

  const isPublic = document?.isPublic ?? false;
  const publicToken = document?.publicToken;
  const publicAccessType = document?.publicAccessType ?? "view";

  const shareUrl = publicToken
    ? `${window.location.origin}/share/${publicToken}`
    : "";

  const handleToggleSharing = async () => {
    setIsUpdating(true);
    try {
      if (isPublic) {
        await disableSharing({ documentId });
        toast.success("Public sharing disabled");
      } else {
        await enableSharing({ documentId });
        toast.success("Public sharing enabled");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccessTypeChange = async (accessType: "view" | "edit") => {
    setIsUpdating(true);
    try {
      await updateAccessType({ documentId, accessType });
      toast.success(`Access type updated to ${accessType === "view" ? "view only" : "edit"}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Generate a public link to share this document with anyone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 overflow-hidden">
          {/* Toggle public sharing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="size-4 text-green-600" />
              ) : (
                <Lock className="size-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">
                {isPublic ? "Public access enabled" : "Public access disabled"}
              </span>
            </div>
            <Button
              variant={isPublic ? "destructive" : "default"}
              size="sm"
              disabled={isUpdating}
              onClick={handleToggleSharing}
            >
              {isPublic ? "Disable" : "Enable"}
            </Button>
          </div>

          {/* Share link and access type */}
          {isPublic && publicToken && (
            <div className="space-y-3 overflow-hidden">
              {/* Copy link - stack vertically */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm w-full overflow-hidden">
                  <Link className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground block">{shareUrl}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  disabled={isUpdating}
                  className="w-full"
                >
                  {copied ? (
                    <Check className="size-4 mr-2" />
                  ) : (
                    <Copy className="size-4 mr-2" />
                  )}
                  {copied ? "Copied to clipboard" : "Copy link"}
                </Button>
              </div>

              {/* Access type selection */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Access type</span>
                <div className="flex gap-2">
                  <Button
                    variant={publicAccessType === "view" ? "default" : "outline"}
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => handleAccessTypeChange("view")}
                    className="flex-1"
                  >
                    <Lock className="size-4 mr-2" />
                    View only
                  </Button>
                  <Button
                    variant={publicAccessType === "edit" ? "default" : "outline"}
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => handleAccessTypeChange("edit")}
                    className="flex-1"
                  >
                    <Globe className="size-4 mr-2" />
                    Can edit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
