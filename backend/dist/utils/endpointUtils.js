import prisma from '../config/prisma.js';
export const getUserEndpoint = async (endpointId, userId) => {
    try {
        const endpoint = await prisma.endpoint.findFirst({
            where: {
                id: endpointId,
                userId: userId
            }
        });
        return endpoint;
    }
    catch (error) {
        console.error('[EndpointUtils] Error fetching user endpoint:', error);
        return null;
    }
};
export const parseIntParam = (param, defaultValue, min, max) => {
    if (!param)
        return defaultValue;
    const parsed = parseInt(param, 10);
    if (isNaN(parsed))
        return defaultValue;
    if (min !== undefined && parsed < min)
        return min;
    if (max !== undefined && parsed > max)
        return max;
    return parsed;
};
export const isValidUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch {
        return false;
    }
};
//# sourceMappingURL=endpointUtils.js.map