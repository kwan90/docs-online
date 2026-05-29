import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    initialContent: v.optional(v.string()),
    ownerId: v.string(),
    roomId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    publicToken: v.optional(v.string()),
    publicAccessType: v.optional(v.union(v.literal("view"), v.literal("edit"))),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_organization_id", ["organizationId"])
    .index("by_public_token", ["publicToken"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "organizationId"],
    }),

  activity_log: defineTable({
    documentId: v.id("documents"),
    userId: v.string(),
    userName: v.string(),
    actionType: v.union(
      v.literal("content_edit"),
      v.literal("title_rename"),
      v.literal("sharing_enabled"),
      v.literal("sharing_disabled"),
      v.literal("access_type_changed"),
      v.literal("document_created")
    ),
    timestamp: v.number(),
    previousContent: v.optional(v.string()),
    newContent: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_document_id", ["documentId", "timestamp"]),
});
