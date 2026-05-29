"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEditorStore } from "@/store/use-editor-store";
import { useDebounce } from "./use-debounce";
import { useAuth } from "@clerk/nextjs";
import { useStatus } from "@liveblocks/react";

/**
 * Hook that tracks content changes in the TipTap editor
 * and logs them to the activity log.
 *
 * Uses a 3-second trailing debounce to batch rapid keystrokes.
 * Waits for Liveblocks sync before tracking to avoid logging initial load.
 */
export function useActivityTracker(
  documentId: Id<"documents">,
  initialContent?: string
) {
  const { editor } = useEditorStore();
  const { user } = useAuth();
  const logContentEdit = useMutation(api.activity.logContentEdit);
  const status = useStatus();

  const previousContentRef = useRef<string>(initialContent ?? "");
  const pendingNewContentRef = useRef<string>("");
  const isSynced = useRef(false);
  const snapshotTimeoutRef = useRef<NodeJS.Timeout>();

  // Wait for Liveblocks to sync, then take the initial snapshot
  useEffect(() => {
    if (status !== "connected" || !editor || isSynced.current) return;

    // Give the editor a moment to fully render the synced content
    snapshotTimeoutRef.current = setTimeout(() => {
      const html = editor.getHTML();
      previousContentRef.current = html;
      isSynced.current = true;
    }, 500);

    return () => {
      if (snapshotTimeoutRef.current) {
        clearTimeout(snapshotTimeoutRef.current);
      }
    };
  }, [status, editor]);

  const debouncedLogEdit = useDebounce(async () => {
    // Don't log anything until we've taken the initial snapshot
    if (!isSynced.current) return;

    const newContent = pendingNewContentRef.current;
    const previousContent = previousContentRef.current;

    if (!newContent || newContent === previousContent) return;

    const userName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Anonymous";

    try {
      await logContentEdit({
        documentId,
        previousContent,
        newContent,
        userName,
      });
      previousContentRef.current = newContent;
    } catch {
      // Silently fail - don't disrupt the editing experience
    }
  }, 3000);

  // Register the onUpdate handler on the editor
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      const html = editor.getHTML();
      pendingNewContentRef.current = html;
      debouncedLogEdit();
    };

    editor.on("update", handler);

    return () => {
      editor.off("update", handler);
    };
  }, [editor, debouncedLogEdit]);
}
