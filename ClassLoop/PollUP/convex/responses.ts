import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const submitResponse = mutation({
  args: {
    sessionId: v.id("sessions"),
    elementId: v.id("elements"),
    participantId: v.string(),
    textValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
    choiceIds: v.optional(v.array(v.string())),
    fileId: v.optional(v.id("_storage")),
  },
  returns: v.id("responses"),
  handler: async (ctx, args) => {
    // Get the element to check its type
    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    // Check if participant already responded to this element
    const existingResponse = await ctx.db
      .query("responses")
      .withIndex("by_participant", (q) => 
        q.eq("participantId", args.participantId).eq("elementId", args.elementId)
      )
      .first();

    // For single_choice_unique, validate that the choice isn't already taken by someone else
    if (element.type === "single_choice_unique" && args.choiceIds && args.choiceIds.length > 0) {
      const selectedChoiceId = args.choiceIds[0];
      
      // Get all responses for this element
      const allResponses = await ctx.db
        .query("responses")
        .withIndex("by_element", (q) => q.eq("elementId", args.elementId))
        .collect();

      // Check if any other participant has already selected this choice
      const isChoiceTaken = allResponses.some(
        response => 
          response.participantId !== args.participantId && 
          response.choiceIds?.includes(selectedChoiceId)
      );

      if (isChoiceTaken) {
        throw new Error("This choice has already been selected by another participant");
      }
    }

    if (existingResponse) {
      // Update existing response
      await ctx.db.patch(existingResponse._id, {
        textValue: args.textValue,
        numberValue: args.numberValue,
        choiceIds: args.choiceIds,
        fileId: args.fileId,
      });
      return existingResponse._id;
    } else {
      // Create new response
      return await ctx.db.insert("responses", {
        sessionId: args.sessionId,
        elementId: args.elementId,
        participantId: args.participantId,
        textValue: args.textValue,
        numberValue: args.numberValue,
        choiceIds: args.choiceIds,
        fileId: args.fileId,
      });
    }
  },
});

export const getParticipantResponses = query({
  args: { 
    sessionId: v.id("sessions"),
    participantId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("participantId"), args.participantId))
      .collect();
  },
});

export const getSessionResponses = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get file URLs and metadata for file responses
    const responsesWithFiles = await Promise.all(
      responses.map(async (response) => {
        let fileUrl = null;
        let fileContentType = null;
        
        if (response.fileId) {
          fileUrl = await ctx.storage.getUrl(response.fileId);
          const metadata = await ctx.db.system.get(response.fileId);
          fileContentType = metadata?.contentType || null;
        }
        
        return {
          ...response,
          fileUrl,
          fileContentType,
        };
      })
    );

    return responsesWithFiles;
  },
});

export const getElementResponses = query({
  args: { elementId: v.id("elements") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_element", (q) => q.eq("elementId", args.elementId))
      .collect();

    // Get file URLs for file responses
    const responsesWithFiles = await Promise.all(
      responses.map(async (response) => ({
        ...response,
        fileUrl: response.fileId ? await ctx.storage.getUrl(response.fileId) : null,
      }))
    );

    return responsesWithFiles;
  },
});

export const getTakenChoices = query({
  args: { 
    elementId: v.id("elements"),
    participantId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    // Get all responses for this element from other participants
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_element", (q) => q.eq("elementId", args.elementId))
      .filter((q) => q.neq(q.field("participantId"), args.participantId))
      .collect();

    // Collect all choice IDs that have been taken by others
    const takenChoices: Array<string> = [];
    responses.forEach(response => {
      if (response.choiceIds) {
        takenChoices.push(...response.choiceIds);
      }
    });

    return takenChoices;
  },
});

export const checkSessionOwnership = query({
  args: { sessionId: v.id("sessions") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return false;
    }

    return session.teacherId === userId;
  },
});

export const deleteAllSessionResponses = mutation({
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

    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    return null;
  },
});

export const deleteParticipantResponses = mutation({
  args: { 
    sessionId: v.id("sessions"),
    participantId: v.string(),
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

    // Find all responses from this participant in this session
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("participantId"), args.participantId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    return null;
  },
});

export const getSessionParticipants = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    participantId: v.string(),
    responseCount: v.number(),
    firstResponseTime: v.number(),
  })),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Group by participant
    const participantMap = new Map<string, { count: number; firstTime: number }>();
    
    responses.forEach(response => {
      const existing = participantMap.get(response.participantId);
      if (existing) {
        existing.count++;
        existing.firstTime = Math.min(existing.firstTime, response._creationTime);
      } else {
        participantMap.set(response.participantId, {
          count: 1,
          firstTime: response._creationTime,
        });
      }
    });

    // Convert to array and sort by first response time
    const participants = Array.from(participantMap.entries()).map(([participantId, data]) => ({
      participantId,
      responseCount: data.count,
      firstResponseTime: data.firstTime,
    }));

    participants.sort((a, b) => a.firstResponseTime - b.firstResponseTime);

    return participants;
  },
});

export const getFileMetadata = query({
  args: { fileId: v.id("_storage") },
  returns: v.union(
    v.object({
      _id: v.id("_storage"),
      _creationTime: v.number(),
      contentType: v.optional(v.string()),
      sha256: v.string(),
      size: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.system.get(args.fileId);
  },
});
