"use client";

import { useState } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { computeDiff, getDiffSummary, DiffPart } from "@/lib/diff";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  PenLine,
  Globe,
  Lock,
  Eye,
  Edit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ActivityItemProps {
  entry: Doc<"activity_log">;
}

export const ActivityItem = ({ entry }: ActivityItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(entry.timestamp), {
    addSuffix: true,
  });

  const renderContent = () => {
    switch (entry.actionType) {
      case "document_created":
        return (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 text-muted-foreground" />
            <span>Document created</span>
          </div>
        );

      case "title_rename":
        return (
          <div className="flex items-center gap-2 text-sm">
            <PenLine className="size-4 text-muted-foreground" />
            <span>
              Renamed from{" "}
              <span className="font-medium text-red-600 line-through">
                {entry.metadata?.oldTitle}
              </span>{" "}
              to{" "}
              <span className="font-medium text-green-600">
                {entry.metadata?.newTitle}
              </span>
            </span>
          </div>
        );

      case "sharing_enabled":
        return (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="size-4 text-green-600" />
            <span>Enabled public sharing</span>
          </div>
        );

      case "sharing_disabled":
        return (
          <div className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-red-600" />
            <span>Disabled public sharing</span>
          </div>
        );

      case "access_type_changed":
        return (
          <div className="flex items-center gap-2 text-sm">
            {entry.metadata?.newAccessType === "edit" ? (
              <Edit className="size-4 text-blue-600" />
            ) : (
              <Eye className="size-4 text-orange-600" />
            )}
            <span>
              Changed access from{" "}
              <span className="font-medium capitalize">
                {entry.metadata?.oldAccessType}
              </span>{" "}
              to{" "}
              <span className="font-medium capitalize">
                {entry.metadata?.newAccessType}
              </span>
            </span>
          </div>
        );

      case "content_edit":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <PenLine className="size-4 text-muted-foreground" />
              <span>Edited content</span>
            </div>
            {entry.previousContent && entry.newContent && (
              <ContentDiff
                previousContent={entry.previousContent}
                newContent={entry.newContent}
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 space-y-1">
        {renderContent()}
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );
};

interface ContentDiffProps {
  previousContent: string;
  newContent: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function ContentDiff({
  previousContent,
  newContent,
  isExpanded,
  onToggle,
}: ContentDiffProps) {
  const parts = computeDiff(previousContent, newContent);
  const summary = getDiffSummary(parts);

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs bg-muted hover:bg-muted/80 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <span className="font-medium">{summary}</span>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 text-xs font-mono max-h-64 overflow-y-auto">
          {parts.map((part, index) => (
            <DiffLine key={index} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffLine({ part }: { part: DiffPart }) {
  if (part.type === "unchanged") {
    // Only show a snippet of unchanged text (max 50 chars)
    const text = part.text;
    if (text.length <= 50) {
      return <span className="text-muted-foreground">{text}</span>;
    }
    return (
      <span className="text-muted-foreground">
        {text.slice(0, 25)}...{text.slice(-25)}
      </span>
    );
  }

  const bgColor = part.type === "added" ? "bg-green-100" : "bg-red-100";
  const textColor = part.type === "added" ? "text-green-800" : "text-red-800";
  const prefix = part.type === "added" ? "+ " : "- ";

  return (
    <span className={`${bgColor} ${textColor} px-1 rounded`}>
      {prefix}
      {part.text}
    </span>
  );
}
