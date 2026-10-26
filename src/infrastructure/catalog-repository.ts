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
  private cached: { expiresAt: number; catalog: Catalog } | null = null;
  private loading: Promise<Result<Catalog>> | null = null;
  constructor(
    private pool: SqlPool,
    private now = () => Date.now(),
  ) {}
  read(): Promise<Result<Catalog>> {
    if (this.cached && this.cached.expiresAt > this.now())
      return Promise.resolve(success(this.cached.catalog));
    if (this.loading) return this.loading;
    this.loading = this.load().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }
  private async load(): Promise<Result<Catalog>> {
    let connection: SqlConnection | undefined;
    try {
      connection = await this.pool.connect();
      const query = await connection.query(
        "select public.wordpairs_catalog() as response",
      );
      const result = query.rows[0]?.response as
        | Result<{ categories: Category[]; pairs: Pair[] }>
        | undefined;
      if (!result) return failure("TEMPORARY_UNAVAILABLE");
      if (!result.ok) return result;
      const catalog = buildCatalog(
        result.value.categories,
        result.value.pairs,
        INITIAL_CATEGORIES,
      );
      if (catalog.ok)
        this.cached = { expiresAt: this.now() + 5000, catalog: catalog.value };
      return catalog;
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
