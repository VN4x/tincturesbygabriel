import { auth, defineMcp } from "@lovable.dev/mcp-js";
import type { AnyToolDefinition } from "@lovable.dev/mcp-js";

import getAccessStatus from "./tools/get-access-status";
import listChapters from "./tools/list-chapters";
import readChapter from "./tools/read-chapter";
import searchBook from "./tools/search-book";
import askTheDoctor from "./tools/ask-the-doctor";
import listMyMessages from "./tools/my-messages";

// The OAuth issuer must be the direct Supabase host: the project ref is the only
// value that survives publish unchanged, and Vite inlines it at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "gabrielbook",
  title: "GabrielBook",
  version: "0.1.0",
  instructions:
    "Tools for 'Metsa vägi ja tervis' by Gabriel Corpus. Readers sign in with their own account: use get_access_status to check entitlement, list_chapters for the table of contents, read_chapter and search_book for the text (full access required), ask_the_doctor to send the author a question and list_my_messages to read replies.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // Cast: the SDK's tool type conflicts with exactOptionalPropertyTypes on the
  // optional outputSchema field.
  tools: [getAccessStatus, listChapters, readChapter, searchBook, askTheDoctor, listMyMessages] as unknown as AnyToolDefinition[],
});
