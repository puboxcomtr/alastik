export function applyTemplate(
    template: string | undefined,
    vars: Record<string, string>
): string {
    if (!template) return '';
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.split(`{${key}}`).join(value || '');
    }
    return result.trim();
}