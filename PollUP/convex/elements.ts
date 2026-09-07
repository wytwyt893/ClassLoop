import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to normalize element orders (ensure 0, 1, 2, 3... sequence)
async function normalizeElementOrders(ctx: any, sessionId: any) {
  const elements = await ctx.db
    .query("elements")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .order("asc")
    .collect();

  // Update orders to be 0, 1, 2, 3...
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].order !== i) {
      await ctx.db.patch(elements[i]._id, { order: i });
    }
  }
}

// Optional batch fix: Normalize all sessions at once (not required - auto-fixes on reorder)
// This is useful if you want to fix all sessions immediately rather than waiting for
// users to trigger reordering on each session
export const fixAllElementOrders = mutation({
  args: {},
  returns: v.object({
    sessionsFixed: v.number(),
    elementsFixed: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Get all sessions for this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_teacher", (q) => q.eq("teacherId", userId))
      .collect();

    let sessionsFixed = 0;
    let elementsFixed = 0;

    for (const session of sessions) {
      const elements = await ctx.db
        .query("elements")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("asc")
        .collect();

      let needsFix = false;
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].order !== i) {
          needsFix = true;
          await ctx.db.patch(elements[i]._id, { order: i });
          elementsFixed++;
        }
      }

      if (needsFix) {
        sessionsFixed++;
      }
    }

    return { sessionsFixed, elementsFixed };
  },
});

export const createElement = mutation({
  args: {
    sessionId: v.id("sessions"),
    type: v.union(
      v.literal("single_choice"),
      v.literal("single_choice_unique"),
      v.literal("multiple_choice"),
      v.literal("text_input"),
      v.literal("number_input"),
      v.literal("file_upload")
    ),
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    choices: v.optional(v.array(v.object({
      id: v.string(),
      text: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
      isCorrect: v.optional(v.boolean()),
    }))),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    step: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Get the next order number (use max + 1 to avoid gaps)
    const existingElements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    const nextOrder = existingElements.length > 0 
      ? Math.max(...existingElements.map(e => e.order)) + 1
      : 0;

    return await ctx.db.insert("elements", {
      sessionId: args.sessionId,
      type: args.type,
      title: args.title,
      subtitle: args.subtitle,
      description: args.description,
      imageId: args.imageId,
      order: nextOrder,
      isActive: true,
      choices: args.choices,
      minValue: args.minValue,
      maxValue: args.maxValue,
      step: args.step,
    });
  },
});

export const getSessionElements = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    // Get image URLs for elements and choices
    const elementsWithImages = await Promise.all(
      elements.map(async (element) => {
        const imageUrl = element.imageId ? await ctx.storage.getUrl(element.imageId) : null;
        
        const choicesWithImages = element.choices ? await Promise.all(
          element.choices.map(async (choice) => ({
            ...choice,
            imageUrl: choice.imageId ? await ctx.storage.getUrl(choice.imageId) : null,
          }))
        ) : undefined;

        return {
          ...element,
          imageUrl,
          choices: choicesWithImages,
        };
      })
    );

    return elementsWithImages;
  },
});

export const getVisibleElementsForParticipant = query({
  args: {
    sessionId: v.id("sessions"),
    participantId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    const responses = await ctx.db
      .query("responses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("participantId"), args.participantId))
      .collect();

    // Create a map of element responses for quick lookup
    const responseMap = new Map();
    responses.forEach(response => {
      responseMap.set(response.elementId, response);
    });

    // Filter elements based on conditional logic
    const visibleElements = [];
    
    for (const element of elements) {
      if (!element.isActive) continue;

      // Check if element should be visible based on conditional logic
      if (element.conditionalLogic?.enabled) {
        const dependentResponse = responseMap.get(element.conditionalLogic.dependsOnElementId);
        
        if (!dependentResponse) {
          // Dependent element hasn't been answered yet, so this element is not visible
          continue;
        }

        const shouldShow = evaluateCondition(
          element.conditionalLogic.condition,
          element.conditionalLogic.value,
          dependentResponse
        );

        if (!shouldShow) {
          continue;
        }
      }

      visibleElements.push(element);
    }

    // Get image URLs for visible elements
    const elementsWithImages = await Promise.all(
      visibleElements.map(async (element) => {
        const imageUrl = element.imageId ? await ctx.storage.getUrl(element.imageId) : null;
        
        const choicesWithImages = element.choices ? await Promise.all(
          element.choices.map(async (choice) => ({
            ...choice,
            imageUrl: choice.imageId ? await ctx.storage.getUrl(choice.imageId) : null,
          }))
        ) : undefined;

        return {
          ...element,
          imageUrl,
          choices: choicesWithImages,
        };
      })
    );

    return elementsWithImages;
  },
});

export const deleteElement = mutation({
  args: { elementId: v.id("elements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete all responses for this element
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_element", (q) => q.eq("elementId", args.elementId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(args.elementId);
    
    // Normalize orders after deletion to remove gaps
    await normalizeElementOrders(ctx, element.sessionId);
    
    return null;
  },
});

export const reorderElements = mutation({
  args: {
    sessionId: v.id("sessions"),
    elementOrders: v.array(v.object({
      elementId: v.id("elements"),
      order: v.number(),
    })),
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

    // Update each element's order
    for (const { elementId, order } of args.elementOrders) {
      const element = await ctx.db.get(elementId);
      if (element && element.sessionId === args.sessionId) {
        await ctx.db.patch(elementId, { order });
      }
    }
    return null;
  },
});

export const moveElementUp = mutation({
  args: {
    elementId: v.id("elements"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    // Get all elements in order
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", element.sessionId))
      .order("asc")
      .collect();

    // Fix any broken orders first (gaps or duplicates)
    let needsNormalization = false;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].order !== i) {
        needsNormalization = true;
        break;
      }
    }

    if (needsNormalization) {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].order !== i) {
          await ctx.db.patch(elements[i]._id, { order: i });
          elements[i].order = i; // Update in memory for the swap below
        }
      }
    }

    const currentIndex = elements.findIndex(e => e._id === args.elementId);

    if (currentIndex > 0) {
      // Swap orders with the element above
      const elementAbove = elements[currentIndex - 1];
      const tempOrder = elements[currentIndex].order;
      await ctx.db.patch(args.elementId, { order: elementAbove.order });
      await ctx.db.patch(elementAbove._id, { order: tempOrder });
      return true;
    }

    return false;
  },
});

export const moveElementDown = mutation({
  args: {
    elementId: v.id("elements"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    // Get all elements in order
    const elements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", element.sessionId))
      .order("asc")
      .collect();

    // Fix any broken orders first (gaps or duplicates)
    let needsNormalization = false;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].order !== i) {
        needsNormalization = true;
        break;
      }
    }

    if (needsNormalization) {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].order !== i) {
          await ctx.db.patch(elements[i]._id, { order: i });
          elements[i].order = i; // Update in memory for the swap below
        }
      }
    }

    const currentIndex = elements.findIndex(e => e._id === args.elementId);

    if (currentIndex < elements.length - 1) {
      // Swap orders with the element below
      const elementBelow = elements[currentIndex + 1];
      const tempOrder = elements[currentIndex].order;
      await ctx.db.patch(args.elementId, { order: elementBelow.order });
      await ctx.db.patch(elementBelow._id, { order: tempOrder });
      return true;
    }

    return false;
  },
});

export const updateElementConditionalLogic = mutation({
  args: {
    elementId: v.id("elements"),
    conditionalLogic: v.optional(v.object({
      enabled: v.boolean(),
      dependsOnElementId: v.id("elements"),
      condition: v.union(
        v.literal("equals"),
        v.literal("not_equals"),
        v.literal("contains"),
        v.literal("greater_than"),
        v.literal("less_than"),
        v.literal("choice_selected"),
        v.literal("choice_not_selected")
      ),
      value: v.optional(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.elementId, {
      conditionalLogic: args.conditionalLogic,
    });
    return null;
  },
});

export const updateElement = mutation({
  args: {
    elementId: v.id("elements"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    choices: v.optional(v.array(v.object({
      id: v.string(),
      text: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
      isCorrect: v.optional(v.boolean()),
    }))),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    step: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.subtitle !== undefined) updateData.subtitle = args.subtitle;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.imageId !== undefined) updateData.imageId = args.imageId;
    if (args.choices !== undefined) updateData.choices = args.choices;
    if (args.minValue !== undefined) updateData.minValue = args.minValue;
    if (args.maxValue !== undefined) updateData.maxValue = args.maxValue;
    if (args.step !== undefined) updateData.step = args.step;

    await ctx.db.patch(args.elementId, updateData);
    return null;
  },
});

export const duplicateElement = mutation({
  args: {
    elementId: v.id("elements"),
  },
  returns: v.id("elements"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const element = await ctx.db.get(args.elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const session = await ctx.db.get(element.sessionId);
    if (!session || session.teacherId !== userId) {
      throw new Error("Unauthorized");
    }

    // Get all elements in the session to determine the next order
    const existingElements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", element.sessionId))
      .order("asc")
      .collect();

    const nextOrder = existingElements.length > 0 
      ? Math.max(...existingElements.map(e => e.order)) + 1
      : 0;

    // Create a duplicate with a new order and "(Copy)" appended to the title
    return await ctx.db.insert("elements", {
      sessionId: element.sessionId,
      type: element.type,
      title: `${element.title} (Copy)`,
      subtitle: element.subtitle,
      description: element.description,
      imageId: element.imageId,
      order: nextOrder,
      isActive: element.isActive,
      choices: element.choices,
      minValue: element.minValue,
      maxValue: element.maxValue,
      step: element.step,
      // Note: Conditional logic is not copied to avoid reference issues
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const importElements = mutation({
  args: {
    sessionId: v.id("sessions"),
    elements: v.array(v.object({
      type: v.union(
        v.literal("single_choice"),
        v.literal("single_choice_unique"),
        v.literal("multiple_choice"),
        v.literal("text_input"),
        v.literal("number_input"),
        v.literal("file_upload")
      ),
      title: v.string(),
      subtitle: v.optional(v.string()),
      description: v.optional(v.string()),
      choices: v.optional(v.array(v.object({
        id: v.string(),
        text: v.optional(v.string()),
        isCorrect: v.optional(v.boolean()),
      }))),
      minValue: v.optional(v.number()),
      maxValue: v.optional(v.number()),
      step: v.optional(v.number()),
    })),
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

    // Get the current highest order number
    const existingElements = await ctx.db
      .query("elements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    let nextOrder = existingElements.length > 0 
      ? Math.max(...existingElements.map(e => e.order)) + 1
      : 0;

    // Create each element
    for (const element of args.elements) {
      await ctx.db.insert("elements", {
        sessionId: args.sessionId,
        type: element.type,
        title: element.title,
        subtitle: element.subtitle,
        description: element.description,
        order: nextOrder,
        isActive: true,
        choices: element.choices,
        minValue: element.minValue,
        maxValue: element.maxValue,
        step: element.step,
      });
      nextOrder++;
    }

    return null;
  },
});

function evaluateCondition(condition: string, value: string | undefined, response: any): boolean {
  switch (condition) {
    case "equals":
      if (response.textValue !== undefined) {
        return response.textValue === value;
      }
      if (response.numberValue !== undefined) {
        return response.numberValue.toString() === value;
      }
      return false;

    case "not_equals":
      if (response.textValue !== undefined) {
        return response.textValue !== value;
      }
      if (response.numberValue !== undefined) {
        return response.numberValue.toString() !== value;
      }
      return false;

    case "contains":
      if (response.textValue !== undefined && value) {
        return response.textValue.toLowerCase().includes(value.toLowerCase());
      }
      return false;

    case "greater_than":
      if (response.numberValue !== undefined && value) {
        return response.numberValue > parseFloat(value);
      }
      return false;

    case "less_than":
      if (response.numberValue !== undefined && value) {
        return response.numberValue < parseFloat(value);
      }
      return false;

    case "choice_selected":
      if (response.choiceIds && value) {
        return response.choiceIds.includes(value);
      }
      return false;

    case "choice_not_selected":
      if (response.choiceIds && value) {
        return !response.choiceIds.includes(value);
      }
      return false;

    default:
      return false;
  }
}
