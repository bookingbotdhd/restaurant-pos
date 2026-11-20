export interface HttpOptions {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
}
export declare function gatewayFetch<T>(url: string, opts?: HttpOptions): Promise<T>;
export declare function basicAuth(user: string, pass: string): string;
