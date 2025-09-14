export function escapePayload(payload: any): any {
    if (typeof payload === 'number' || typeof payload === 'boolean') {
        return payload.toString();
    }
    payload ??= '';
    if (typeof payload === 'object') {
        return JSON.stringify(payload);
    }
}
