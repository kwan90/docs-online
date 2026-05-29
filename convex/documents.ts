import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { mutation, query } from "./_generated/server";
import { logAction } from "./activity";

export const getByIds = query({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, { ids }) => {
    const documents = [];

    for (const id of ids) {
      const document = await ctx.db.get(id);

      if (document) {
        documents.push({ id: document._id, name: document.title });
      } else {
        documents.push({ id, name: "[Removed]" });
      }
    }

    return documents;
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()), initialContent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unathorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const documentId = await ctx.db.insert("documents", {
      title: args.title ?? "Untitled document",
      ownerId: user.subject,
      organizationId,
      initialContent: args.initialContent,
      isPublic: false,
    });

    await logAction(ctx, {
      documentId,
      userId: user.subject,
      userName: user.name ?? "Unknown",
      actionType: "document_created",
    });

    return documentId;
  },
});

export const get = query({
  args: { paginationOpts: paginationOptsValidator, search: v.optional(v.string()) },
  handler: async (ctx, { search, paginationOpts }) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    // Search within organization
    if (search && organizationId) {
      return ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("organizationId", organizationId)
        )
        .paginate(paginationOpts);
    }

    // Personal search
    if (search) {
      return await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) => {
          return q.search("title", search).eq("ownerId", user.subject);
        })
        .paginate(paginationOpts);
    }

    // All docs inside organization
    if (organizationId) {
      return await ctx.db
        .query("documents")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
        .paginate(paginationOpts);
    }

    // All personal docs
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user.subject))
      .paginate(paginationOpts);
  },
});

export const removeById = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const document = await ctx.db.get(args.id);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );
    if (!isOwner && !isOrganizationMember) {
      throw new ConvexError("Unauthorized");
    }

    return await ctx.db.delete(args.id);
  },
});

export const updateById = mutation({
  args: { id: v.id("documents"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const document = await ctx.db.get(args.id);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    if (!isOwner && !isOrganizationMember) {
      throw new ConvexError("Unauthorized");
    }

    const oldTitle = document.title;
    await ctx.db.patch(args.id, { title: args.title });

    await logAction(ctx, {
      documentId: args.id,
      userId: user.subject,
      userName: user.name ?? "Unknown",
      actionType: "title_rename",
      metadata: { oldTitle, newTitle: args.title },
    });
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const document = await ctx.db.get(id);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    return document;
  },
});

export const getByPublicToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .unique();

    if (!document) {
      throw new ConvexError("Document not found or not publicly shared");
    }

    if (!document.isPublic) {
      throw new ConvexError("Document is not publicly shared");
    }

    return document;
  },
});

export const enablePublicSharing = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    if (!isOwner && !isOrganizationMember) {
      throw new ConvexError("Unauthorized");
    }

    const publicToken = crypto.randomUUID();

    await ctx.db.patch(args.documentId, {
      isPublic: true,
      publicToken,
      publicAccessType: "view",
    });

    await logAction(ctx, {
      documentId: args.documentId,
      userId: user.subject,
      userName: user.name ?? "Unknown",
      actionType: "sharing_enabled",
    });

    return publicToken;
  },
});

export const disablePublicSharing = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    if (!isOwner && !isOrganizationMember) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.patch(args.documentId, {
      isPublic: false,
      publicToken: undefined,
      publicAccessType: undefined,
    });

    await logAction(ctx, {
      documentId: args.documentId,
      userId: user.subject,
      userName: user.name ?? "Unknown",
      actionType: "sharing_disabled",
    });
  },
});

export const updatePublicAccessType = mutation({
  args: {
    documentId: v.id("documents"),
    accessType: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const organizationId = (user.organization_id ?? undefined) as string | undefined;

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new ConvexError("Document not found");
    }

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    if (!isOwner && !isOrganizationMember) {
      throw new ConvexError("Unauthorized");
    }

    const oldAccessType = document.publicAccessType;
    await ctx.db.patch(args.documentId, {
      publicAccessType: args.accessType,
    });

    await logAction(ctx, {
      documentId: args.documentId,
      userId: user.subject,
      userName: user.name ?? "Unknown",
      actionType: "access_type_changed",
      metadata: { oldAccessType: oldAccessType ?? "view", newAccessType: args.accessType },
    });
  },
});
