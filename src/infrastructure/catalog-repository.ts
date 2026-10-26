import type { CatalogReader } from "../application/matches";
import type { ContentRepository } from "../application/ports";
import { buildCatalog, type Catalog } from "../domain/catalog";
import type { Category, Pair } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import type { SqlConnection, SqlPool } from "./supabase-postgres";

const INITIAL_CATEGORIES = [
  "heroes",
  "colors",
  "years",
  "directors",
  "singers",
  "opposites",
];
export class PostgresCatalogRepository
  implements CatalogReader, ContentRepository
{
  private cached: Catalog | null = null;
  constructor(private pool: SqlPool) {}
  read(): Promise<Result<Catalog>> {
    return this.load();
  }
  private async load(): Promise<Result<Catalog>> {
    let connection: SqlConnection | undefined;
    try {
      connection = await this.pool.connect();
      const revision = await connection.query(
        "select public.wordpairs_catalog_revision() as revision",
      );
      if (
        this.cached &&
        this.cached.revision === Number(revision.rows[0]?.revision)
      )
        return success(this.cached);
      const query = await connection.query(
        "select public.wordpairs_catalog() as response",
      );
      const result = query.rows[0]?.response as
        | Result<{ categories: Category[]; pairs: Pair[]; revision: number }>
        | undefined;
      if (!result) return failure("TEMPORARY_UNAVAILABLE");
      if (!result.ok) return result;
      const catalog = buildCatalog(
        result.value.categories,
        result.value.pairs,
        INITIAL_CATEGORIES,
      );
      if (!catalog.ok) return catalog;
      this.cached = { ...catalog.value, revision: result.value.revision };
      return success(this.cached);
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection?.release();
    }
  }
  async categories() {
    const data = await this.read();
    return data.ok ? success(data.value.categories) : data;
  }
  async pairs(categoryId: string) {
    const data = await this.read();
    return data.ok
      ? success(data.value.pairs.filter((p) => p.categoryId === categoryId))
      : data;
  }
  async pair(id: string, version: number) {
    const data = await this.read();
    if (!data.ok) return data;
    const pair = data.value.pairs.find(
      (p) => p.id === id && p.version === version,
    );
    return pair ? success(pair) : failure("NOT_FOUND");
  }
}
