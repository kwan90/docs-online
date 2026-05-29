"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useActivityStore } from "@/store/use-activity-store";
import { ActivityItem } from "./activity-item";
import { X, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivitySidebarProps {
  documentId: Id<"documents">;
}

export const ActivitySidebar = ({ documentId }: ActivitySidebarProps) => {
  const { isOpen, closeActivity } = useActivityStore();

  const { results, status, loadMore } = usePaginatedQuery(
    api.activity.getByDocumentId,
    { documentId },
    { initialNumItems: 20 }
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={closeActivity}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-white border-l border-border z-50 flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="size-4" />
            <h2 className="font-semibold">Activity</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={closeActivity}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4">
          {results.length === 0 && status === "Exhausted" ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <History className="size-8 mb-2" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs">Changes will appear here</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((entry) => (
                <ActivityItem key={entry._id} entry={entry} />
              ))}

              {/* Load more */}
              {status === "CanLoadMore" && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadMore(20)}
                  >
                    Load more
                  </Button>
                </div>
              )}

              {status === "Loading" && (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
