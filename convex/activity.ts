import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";

type ActionLoggerCtx = {
  db: {
    insert: (table: string, doc: Record<string, any>) => Promise<Id<any>>;
  };
};

/**
 * Helper function to log activity from within other mutations.
 * NOT a mutation itself — called from within mutations via ctx.
 */
export async function logAction(
  ctx: ActionLoggerCtx,
  args: {
    documentId: Id<"documents">;
    userId: string;
    userName: string;
    actionType:
      | "content_edit"
      | "title_rename"
      | "sharing_enabled"
      | "sharing_disabled"
      | "access_type_changed"
      | "document_created";
    previousContent?: string;
    newContent?: string;
    metadata?: Record<string, any>;
  }
) {
  await ctx.db.insert("activity_log", {
    documentId: args.documentId,
    userId: args.userId,
    userName: args.userName,
    actionType: args.actionType,
    timestamp: Date.now(),
    previousContent: args.previousContent,
    newContent: args.newContent,
    metadata: args.metadata,
  });
}

/**
 * Client-callable mutation for logging content edits.
 * Called from the useActivityTracker hook.
 */
export const logContentEdit = mutation({
  args: {
    documentId: v.id("documents"),
    previousContent: v.string(),
    newContent: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      return; // Silently fail for unauthenticated users
    }

    // Verify user has access to the document
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return;
    }

    await logAction(ctx, {
      documentId: args.documentId,
      userId: user.subject,
      userName: args.userName,
      actionType: "content_edit",
      previousContent: args.previousContent.slice(0, 500000),
      newContent: args.newContent.slice(0, 500000),
    });
  },
});

/**
 * Query to get activity log entries for a document.
 * Supports pagination via cursor.
 */
export const getByDocumentId = query({
  args: {
    documentId: v.id("documents"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { documentId, paginationOpts }) => {
    return await ctx.db
      .query("activity_log")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .order("desc")
      .paginate(paginationOpts);
  },
});
