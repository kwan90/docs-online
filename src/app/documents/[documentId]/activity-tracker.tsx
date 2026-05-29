"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import { useActivityTracker } from "@/hooks/use-activity-tracker";

interface ActivityTrackerProps {
  documentId: Id<"documents">;
  initialContent?: string;
}

/**
 * Wrapper component that must be rendered inside RoomProvider
 * because useActivityTracker calls useStatus() from Liveblocks.
 */
export const ActivityTracker = ({ documentId, initialContent }: ActivityTrackerProps) => {
  useActivityTracker(documentId, initialContent);
  return null;
};
