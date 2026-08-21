/**
 * The planner stores no files today, and nothing calls this yet — deliberately.
 * It is one interface and a thin adapter, and it exists so the first
 * attachment is a one-file decision rather than an architecture one. The
 * alternative, reaching for `@vercel/blob` directly at the first upload, is how
 * a storage provider gets welded into a component.
 *
 * Nothing is ever written to disk: Vercel Functions have no persistent
 * filesystem, so anything written there vanishes with the instance.
 */
export interface BlobStore {
  put(key: string, data: Blob | ArrayBuffer | string): Promise<string>;
  url(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Swapping this for S3, R2, or Supabase Storage is one implementation of the
 * interface above. `@vercel/blob` is imported lazily so it is not a dependency
 * until something actually uploads a file.
 */
export class VercelBlobStore implements BlobStore {
  async put(key: string, data: Blob | ArrayBuffer | string): Promise<string> {
    const { put } = await import("@vercel/blob");
    const { url } = await put(key, data as Blob, { access: "public" });
    return url;
  }

  async url(key: string): Promise<string> {
    const { head } = await import("@vercel/blob");
    return (await head(key)).url;
  }

  async delete(key: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}
