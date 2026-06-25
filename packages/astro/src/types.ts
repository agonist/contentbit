export type MaybePromise<T> = T | PromiseLike<T>
export type AstroMarkdownRenderer = (md: string) => MaybePromise<string>
