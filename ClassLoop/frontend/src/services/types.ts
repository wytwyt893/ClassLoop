export type Id<T extends string> = string & { readonly __table?: T };

export interface LocalUser {
  _id: Id<"users">;
  _creationTime: number;
  email: string;
  password: string;
  name: string;
  role: "teacher";
}

export interface LocalSession {
  _id: Id<"sessions">;
  _creationTime: number;
  title: string;
  description?: string;
  teacherId: Id<"users">;
  isActive: boolean;
  sessionCode: string;
  resultsPublic?: boolean;
  resultsPinCode?: string;
  completionTitle?: string;
  completionSubtitle?: string;
  completionDescription?: string;
  completionImageId?: Id<"_storage">;
  completionImageUrl?: string | null;
  bgColor?: string;
  accentColor?: string;
}

export interface LocalChoice {
  id: string;
  text?: string;
  imageId?: Id<"_storage">;
  imageUrl?: string | null;
  isCorrect?: boolean;
}

export interface LocalElement {
  _id: Id<"elements">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  type:
    | "single_choice"
    | "single_choice_unique"
    | "multiple_choice"
    | "text_input"
    | "number_input"
    | "file_upload";
  title: string;
  subtitle?: string;
  description?: string;
  imageId?: Id<"_storage">;
  imageUrl?: string | null;
  order: number;
  isActive: boolean;
  choices?: LocalChoice[];
  minValue?: number;
  maxValue?: number;
  step?: number;
  conditionalLogic?: {
    enabled: boolean;
    dependsOnElementId: Id<"elements">;
    condition:
      | "equals"
      | "not_equals"
      | "contains"
      | "greater_than"
      | "less_than"
      | "choice_selected"
      | "choice_not_selected";
    value?: string;
  };
}

export interface LocalResponse {
  _id: Id<"responses">;
  _creationTime: number;
  sessionId: Id<"sessions">;
  elementId: Id<"elements">;
  participantId: string;
  textValue?: string;
  numberValue?: number;
  choiceIds?: string[];
  fileId?: Id<"_storage">;
  fileUrl?: string | null;
  fileContentType?: string | null;
}

export interface LocalFile {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
  dataUrl: string;
}

export interface LocalDatabase {
  users: LocalUser[];
  sessions: LocalSession[];
  elements: LocalElement[];
  responses: LocalResponse[];
  files: LocalFile[];
}

export type Doc<T extends string> =
  T extends "sessions" ? LocalSession :
  T extends "elements" ? LocalElement :
  T extends "responses" ? LocalResponse :
  T extends "users" ? LocalUser :
  never;

