/**
 * What: Generic Map-backed repository with optional immutability (`freeze`).
 * Why: Fast O(1) lookup and safe startup-time registry loading.
 * How to use:
 * `const repo = new MemoryRepository<string, T>(); repo.register("k", v);`
 */
import {
  MutableRepository,
  RepositoryRegistration,
} from "../core/contracts/repository";

export class MemoryRepository<TKey extends string, TValue>
  implements MutableRepository<TKey, TValue>
{
  private readonly registry = new Map<TKey, TValue>();
  private isFrozen = false;

  public register(key: TKey, value: TValue): void {
    this.ensureMutable();
    this.registry.set(key, value);
  }

  public registerMany(
    entries: ReadonlyArray<RepositoryRegistration<TKey, TValue>>,
  ): void {
    this.ensureMutable();

    for (const entry of entries) {
      this.registry.set(entry.key, entry.value);
    }
  }

  public get(key: TKey): TValue | undefined {
    return this.registry.get(key);
  }

  public delete(key: TKey): boolean {
    this.ensureMutable();
    return this.registry.delete(key);
  }

  public has(key: TKey): boolean {
    return this.registry.has(key);
  }

  public list(): ReadonlyArray<RepositoryRegistration<TKey, TValue>> {
    return Array.from(this.registry.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }

  public freeze(): void {
    this.isFrozen = true;
  }

  private ensureMutable(): void {
    if (this.isFrozen) {
      throw new Error("Repository is frozen and cannot be mutated.");
    }
  }
}
