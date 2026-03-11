/**
 * What: Serialize/deserialize contract for rule structures.
 * Why: Supports storage, transport, and recovery of rules.
 * How to use:
 * `const raw = serializer.serialize(ast); serializer.deserialize(raw);`
 */
export interface Serializer<TValue, TSerialized = string> {
  serialize(value: TValue): TSerialized;
  deserialize(payload: TSerialized): TValue;
}
