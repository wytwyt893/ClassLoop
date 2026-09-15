import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Generate a random 6-digit session code
function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const createSession = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    resultsPublic: v.optional(v.boolean()),
    resultsPinCode: v.optional(v.string()),
    completionTitle: v.optional(v.string()),
    completionSubtitle: v.optional(v.string()),
    completionDescription: v.optional(v.string()),
    completionImageId: v.optional(v.id("_storage")),
    bgColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create a session");
    }

    let sessionCode: string;
    let existingSession;
    
    // Ensure unique session code
    do {
      sessionCode = generateSessionCode();
      existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_session_code", (q) => q.eq("sessionCode", sessionCode))
        .first();
    } while (existingSession);

    return await ctx.db.insert("sessions", {
      title: args.title,
      description: args.description,
      teacherId: userId,
      isActive: true,
      sessionCode,
      resultsPublic: args.resultsPublic ?? true,
      resultsPinCode: args.resultsPinCode,
      completionTitle: args.completionTitle,
      completionSubtitle: args.completionSubtitle,
      completionDescription: args.completionDescription,
      completionImageId: args.completionImageId,
      bgColor: args.bgColor,
      accentColor: args.accentColor,
    });
  },
});

export const updateSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    resultsPublic: v.optional(v.boolean()),
    resultsPinCode: v.optional(v.string()),
    completionTitle: v.optional(v.string()),
    completionSubtitle: v.optional(v.string()),
    completionDescription: v.optional(v.string()),
    completionImageId: v.optional(v.id("_storage")),
    bgColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.resultsPublic !== undefined) updates.resultsPublic = args.resultsPublic;
    if (args.resultsPinCode !== undefined) updates.resultsPinCode = args.resultsPinCode;
    if (args.completionTitle !== undefined) updates.completionTitle = args.completionTitle;
    if (args.completionSubtitle !== undefined) updates.completionSubtitle = args.completionSubtitle;
    if (args.completionDescription !== undefined) updates.completionDescription = args.completionDescription;
    if (args.completionImageId !== undefined) updates.completionImageId = args.completionImageId;
    if (args.bgColor !== undefined) updates.bgColor = args.bgColor;
    if (args.accentColor !== undefined) updates.accentColor = args.accentColor;

    await ctx.db.patch(args.sessionId, updates);
    return null;
  },
});

export const getTeacherSessions = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("sessions"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    teacherId: v.id("users"),
    isActive: v.boolean(),
    sessionCode: v.string(),
    resultsPublic: v.optional(v.boolean()),
    resultsPinCode: v.optional(v.string()),
    completionTitle: v.optional(v.string()),
    completionSubtitle: v.optional(v.string()),
    completionDescription: v.optional(v.string()),
    completionImageId: v.optional(v.id("_storage")),
    bgColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("sessions")
      .withIndex("by_teacher", (q) => q.eq("teacherId", userId))
      .order("desc")
      .collect();
  },
});

export const getSessionByCode = query({
  args: { sessionCode: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sessions"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      teacherId: v.id("users"),
      isActive: v.boolean(),
      sessionCode: v.string(),
      resultsPublic: v.optional(v.boolean()),
      resultsPinCode: v.optional(v.string()),
      completionTitle: v.optional(v.string()),
      completionSubtitle: v.optional(v.string()),
      completionDescription: v.optional(v.string()),
      completionImageId: v.optional(v.id("_storage")),
      bgColor: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      completionImageUrl: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_code", (q) => q.eq("sessionCode", args.sessionCode))
      .first();

    if (!session) return null;

    // Get completion image URL if exists
    const completionImageUrl = session.completionImageId 
      ? await ctx.storage.getUrl(session.completionImageId) 
      : null;

    return {
      ...session,
      completionImageUrl,
    };
  },
});

export const verifyResultsAccess = query({
  args: { 
    sessionCode: v.string(),
    pinCode: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_code", (q) => q.eq("sessionCode", args.sessionCode))
      .first();

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.resultsPublic) {
      return { success: true };
    }

    if (!args.pinCode) {
      return { success: false, error: "Pin code required" };
    }

    if (session.resultsPinCode !== args.pinCode) {
      return { success: false, error: "Invalid pin code" };
    }

    return { success: true };
  },
});

export const toggleSessionActive = mutation({
  args: {
    sessionId: v.id("sessions"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      isActive: args.isActive,
    });
    return null;
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Delete all elements and responses for this session
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const element of elements) {
      await ctx.db.delete(element._id);
    }

    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(args.sessionId);
    return null;
  },
});

export const cloneSession = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Generate unique session code for the clone
    let sessionCode: string;
    let existingSession;
    
    do {
      sessionCode = generateSessionCode();
      existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_session_code", (q) => q.eq("sessionCode", sessionCode))
        .first();
    } while (existingSession);

    // Create the cloned session with only defined fields
    const newSessionData: any = {
      title: `${session.title} (Copy)`,
      teacherId: userId,
      isActive: false, // Start cloned sessions as inactive
      sessionCode,
    };

    // Only add optional fields if they exist
    if (session.description !== undefined) newSessionData.description = session.description;
    if (session.resultsPublic !== undefined) newSessionData.resultsPublic = session.resultsPublic;
    if (session.resultsPinCode !== undefined) newSessionData.resultsPinCode = session.resultsPinCode;
    if (session.completionTitle !== undefined) newSessionData.completionTitle = session.completionTitle;
    if (session.completionSubtitle !== undefined) newSessionData.completionSubtitle = session.completionSubtitle;
    if (session.completionDescription !== undefined) newSessionData.completionDescription = session.completionDescription;
    if (session.completionImageId !== undefined) newSessionData.completionImageId = session.completionImageId;
    if (session.bgColor !== undefined) newSessionData.bgColor = session.bgColor;
    if (session.accentColor !== undefined) newSessionData.accentColor = session.accentColor;

    const newSessionId = await ctx.db.insert("sessions", newSessionData);

    // Get all elements from the original session
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Map old element IDs to new element IDs for conditional logic
    const elementIdMap = new Map<Id<"elements">, Id<"elements">>();

    // First pass: create all elements without conditional logic
    for (const element of elements) {
      const newElementData: any = {
        sessionId: newSessionId,
        type: element.type,
        title: element.title,
        order: element.order,
        isActive: element.isActive,
      };

      // Only add optional fields if they exist
      if (element.subtitle !== undefined) newElementData.subtitle = element.subtitle;
      if (element.description !== undefined) newElementData.description = element.description;
      if (element.imageId !== undefined) newElementData.imageId = element.imageId;
      if (element.choices !== undefined) newElementData.choices = element.choices;
      if (element.minValue !== undefined) newElementData.minValue = element.minValue;
      if (element.maxValue !== undefined) newElementData.maxValue = element.maxValue;
      if (element.step !== undefined) newElementData.step = element.step;
      // Don't copy conditional logic yet

      const newElementId = await ctx.db.insert("elements", newElementData);
      elementIdMap.set(element._id, newElementId);
    }

    // Second pass: update conditional logic with new element IDs
    for (const element of elements) {
      if (element.conditionalLogic?.enabled) {
        const newElementId = elementIdMap.get(element._id);
        const newDependsOnId = elementIdMap.get(element.conditionalLogic.dependsOnElementId);
        
        if (newElementId && newDependsOnId) {
          await ctx.db.patch(newElementId, {
            conditionalLogic: {
              enabled: element.conditionalLogic.enabled,
              dependsOnElementId: newDependsOnId,
              condition: element.conditionalLogic.condition,
              value: element.conditionalLogic.value,
            },
          });
        }
      }
    }

    return newSessionId;
  },
});
