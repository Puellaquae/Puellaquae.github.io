import { BasicMetadata } from ".";
import { HighlightFenceCodeMetadata, HighlightInlineCodeMetadata, RawHtmlMetadata, TitleMetadata } from "./macro";
import { } from "./macro";

type Merge<A, B> = { [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never };
type Merges<A, C = {}> = A extends [infer F, ...infer R] ? Merges<R, Merge<F, C>> : C;

type Metadata = Merges<[BasicMetadata, TitleMetadata, HighlightInlineCodeMetadata, HighlightFenceCodeMetadata, RawHtmlMetadata]>;

export { Metadata };