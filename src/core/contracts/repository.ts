/**
 * What: Generic repository contracts for in-memory catalogs.
 * Why: Provides one reusable CRUD-like API for engine registries.
 * How to use:
 * `repo.register("COMMON:EXISTS", definition); repo.get(key);`
 */
export interface RepositoryRegistration<TKey extends string, TValue> {
  key: TKey;
  value: TValue;
}

export interface ReadOnlyRepository<TKey extends string, TValue> {
  get(key: TKey): TValue | undefined;
  has(key: TKey): boolean;
  list(): ReadonlyArray<RepositoryRegistration<TKey, TValue>>;
}

export interface MutableRepository<TKey extends string, TValue>
  extends ReadOnlyRepository<TKey, TValue> {
  register(key: TKey, value: TValue): void;
  registerMany(
    entries: ReadonlyArray<RepositoryRegistration<TKey, TValue>>,
  ): void;
  delete(key: TKey): boolean;
  freeze(): void;
}
