import prisma from '../config/prisma.js';
import { Endpoint } from '@prisma/client';

export const getUserEndpoint = async (
    endpointId: number, 
    userId: number
): Promise<Endpoint | null> => {
    try {
        const endpoint = await prisma.endpoint.findFirst({
            where: { 
                id: endpointId, 
                userId: userId 
            }
        });
        return endpoint;
    } catch (error) {
        console.error('[EndpointUtils] Error fetching user endpoint:', error);
        return null;
    }
};

export const parseIntParam = (param: string | undefined, defaultValue: number, min?: number, max?: number): number => {
    if (!param) return defaultValue;
    
    const parsed = parseInt(param, 10);
    if (isNaN(parsed)) return defaultValue;
    
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    
    return parsed;
};

export const isValidUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};