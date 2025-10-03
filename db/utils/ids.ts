// Edge Runtime compatible UUID generation
const generateUUID = (): string => {
    // Generate a UUID v4 compatible string using Web Crypto API or fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        // Use Web Crypto API if available (works in Edge Runtime)
        return crypto.randomUUID();
    }

    // Fallback for environments without crypto.randomUUID
    // This generates a UUID v4 compatible string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const createId = (): string => {
    return generateUUID();
};

export const createShortId = (): string => {
    // Generate a shorter ID for URLs, still unique enough for our use case
    return generateUUID().replace(/-/g, "").substring(0, 12);
};