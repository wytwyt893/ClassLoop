import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  sessions: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    teacherId: v.id("users"),
    isActive: v.boolean(),
    sessionCode: v.string(), // unique 6-digit code for students
    // Results privacy settings
    resultsPublic: v.optional(v.boolean()),
    resultsPinCode: v.optional(v.string()), // 4-digit pin code
    // Completion message settings
    completionTitle: v.optional(v.string()),
    completionSubtitle: v.optional(v.string()),
    completionDescription: v.optional(v.string()),
    completionImageId: v.optional(v.id("_storage")),
    // Customization settings
    bgColor: v.optional(v.string()), // hex color for background
    accentColor: v.optional(v.string()), // hex color for accent elements
  })
    .index("by_teacher", ["teacherId"])
    .index("by_session_code", ["sessionCode"]),

  elements: defineTable({
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
    order: v.number(),
    isActive: v.boolean(),
    // For choice questions
    choices: v.optional(v.array(v.object({
      id: v.string(),
      text: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
      isCorrect: v.optional(v.boolean()),
    }))),
    // For number input
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    step: v.optional(v.number()),
    // Conditional rendering
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
      value: v.optional(v.string()), // For text/number comparisons or choice IDs
    })),
  }).index("by_session", ["sessionId", "order"]),

  responses: defineTable({
    sessionId: v.id("sessions"),
    elementId: v.id("elements"),
    participantId: v.string(), // anonymous participant identifier
    // Response data based on element type
    textValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
    choiceIds: v.optional(v.array(v.string())),
    fileId: v.optional(v.id("_storage")),
  })
    .index("by_session", ["sessionId"])
    .index("by_element", ["elementId"])
    .index("by_participant", ["participantId", "elementId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
