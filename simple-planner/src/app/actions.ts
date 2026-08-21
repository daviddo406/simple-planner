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

export async function deleteTask(id: number): Promise<void> {
  await db.deleteTask(id);
  revalidatePath("/");
}

export async function setSlime(id: string): Promise<void> {
  // Validated against the id list in `db.setSlime` before it is written; this
  // value arrives from the client.
  await db.setSlime(id);
  revalidatePath("/");
}
