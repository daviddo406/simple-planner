"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/db/queries";

/**
 * Server Actions rather than route handlers: there is no `/api` directory.
 * Forms post directly to these, and `revalidatePath('/')` re-renders the week.
 *
 * The day key is passed in from the client, because only the client knows the
 * user's civil date. `db.addTask` validates its shape before it reaches a
 * query.
 */
export async function addTask(dayKey: string, formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "");
  if (!title.trim()) {
    // An empty submit is a user pressing enter in an empty box, not an error
    // worth surfacing.
    return;
  }
  await db.addTask(dayKey, title);
  revalidatePath("/");
}

export async function toggleTask(id: number): Promise<void> {
  await db.toggleTask(id);
  revalidatePath("/");
}

/**
 * The title comes from the client as a plain string rather than a `FormData`,
 * because the row's edit form is submitted by React rather than posted; the
 * empty case is the same tolerated no-op as `addTask`.
 */
export async function renameTask(id: number, title: string): Promise<void> {
  if (!title.trim()) {
    return;
  }
  await db.renameTask(id, title);
  revalidatePath("/");
}

export async function deleteTask(id: number): Promise<void> {
  await db.deleteTask(id);
  revalidatePath("/");
}

export async function setSlime(id: string): Promise<void> {
  // Validated against the id list in `db.setSlime` before it is written; this
  // value arrives from the client.
  await db.setSlime(id);
  // "layout", like the theme: the accent it decides is published on <html>.
  revalidatePath("/", "layout");
}

export async function setTheme(choice: string): Promise<void> {
  // Validated against the choice list in `db.setTheme` before it is written;
  // this value arrives from the client.
  await db.setTheme(choice);
  // "layout" rather than the default "page": the theme is rendered as an
  // attribute on <html> in the root layout, and a page-only revalidation
  // would leave a client-side navigation carrying the previous ramp.
  revalidatePath("/", "layout");
}
