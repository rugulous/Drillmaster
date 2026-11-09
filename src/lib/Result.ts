export type Result<T> = {
    success: false;
    errors: string[]
} | {
    success: true;
    result: T
}