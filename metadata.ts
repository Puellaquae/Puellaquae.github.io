import { BasicMetadata, MacrosMetadatas } from "./index.js";

type Intersection<A, B> = A extends B ? A : never;
type SameProperty<A, B> = Intersection<keyof A, keyof B>;
type PropertySameType<P, A, B> = P extends keyof A ? P extends keyof B ? A[P] extends B[P] ? true : B[P] extends A[P] ? true : false : false : false;
type NoExcludeProperty<A, B> = PropertySameType<SameProperty<A, B>, A, B>;
type Merge<A, B> = NoExcludeProperty<A, B> extends true ? { [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never } : never;
type Merges<A, C = {}> = A extends [infer F, ...infer R] ? Merges<R, Merge<F, C>> : C;

type Metadata = Merges<[BasicMetadata, ...MacrosMetadatas]>;

export { Metadata };