/**
 * What: Runtime declaration shim for `zstd-codec` when executing with ts-node.
 * Why: Ensures API server can compile in development mode.
 * How to use:
 * Imported implicitly by TypeScript compiler.
 */
declare module "zstd-codec" {
  export const ZstdCodec: {
    run(callback: (zstd: any) => void): void;
  };
}
