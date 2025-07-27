import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { getUserEndpoint, parseIntParam } from '../../utils/endpointUtils';

export const getHourlyMetrics = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;

        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }
        
        const rangeHours = parseIntParam(req.query.range as string, 24, 1, 168);
        
        const result = await prisma.$queryRaw`
            SELECT 
                hour, 
                avg_response_time, 
                (up_checks::FLOAT / NULLIF(total_checks, 0)::FLOAT) * 100 AS uptime_percentage,
                total_checks,
                up_checks
            FROM endpoint_metrics_hourly
            WHERE "endpointId" = ${endpointId} 
            AND hour >= NOW() - INTERVAL '${rangeHours} hours'
            ORDER BY hour ASC
        `;

        res.status(200).json({
            endpointId,
            rangeHours,
            metrics: result
        });
    } catch (error) {
        console.error('[MetricsController] Get hourly metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch hourly metrics.' });
    }
};

export const getDailyMetrics = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        
        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }

        const rangeDays = parseIntParam(req.query.range as string, 30, 1, 365);
        
        const result = await prisma.$queryRaw`
            SELECT 
                day, 
                avg_response_time, 
                (up_checks::FLOAT / NULLIF(total_checks, 0)::FLOAT) * 100 AS uptime_percentage,
                total_checks,
                up_checks
            FROM endpoint_metrics_daily
            WHERE "endpointId" = ${endpointId} 
            AND day >= NOW() - INTERVAL '${rangeDays} days'
            ORDER BY day ASC
        `;

        res.status(200).json({
            endpointId,
            rangeDays,
            metrics: result
        });
    } catch (error) {
        console.error('[MetricsController] Get daily metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch daily metrics.' });
    }
};

export const getRecentMetrics = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        
        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }

        const limit = parseIntParam(req.query.limit as string, 20, 1, 100);

        const recentMetrics = await prisma.endpointMetric.findMany({
            where: { endpointId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
                id: true,
                timestamp: true,
                responseTimeMs: true,
                statusCode: true,
                status: true
            }
        });

        res.status(200).json({
            endpointId,
            limit,
            metrics: recentMetrics
        });
    } catch (error) {
        console.error('[MetricsController] Get recent metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch recent metrics.' });
    }
};

export const getMetricsSummary = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        
        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }

        const summary = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_checks,
                COUNT(*) FILTER (WHERE status = 'UP') as up_checks,
                COUNT(*) FILTER (WHERE status = 'DOWN') as down_checks,
                COUNT(*) FILTER (WHERE status = 'TIMEOUT') as timeout_checks,
                AVG(CASE WHEN status = 'UP' THEN "responseTimeMs" END) as avg_response_time,
                MIN(CASE WHEN status = 'UP' THEN "responseTimeMs" END) as min_response_time,
                MAX(CASE WHEN status = 'UP' THEN "responseTimeMs" END) as max_response_time,
                (COUNT(*) FILTER (WHERE status = 'UP')::FLOAT / COUNT(*)::FLOAT) * 100 as uptime_percentage
            FROM "EndpointMetric" 
            WHERE "endpointId" = ${endpointId}
            AND timestamp >= NOW() - INTERVAL '24 hours'
        `;

        const currentStatus = await prisma.endpointMetric.findFirst({
            where: { endpointId },
            orderBy: { timestamp: 'desc' },
            select: {
                status: true,
                statusCode: true,
                responseTimeMs: true,
                timestamp: true
            }
        });

        res.status(200).json({
            endpointId,
            summary: Array.isArray(summary) ? summary[0] : summary,
            currentStatus,
            endpoint: {
                id: endpoint.id,
                name: endpoint.name,
                url: endpoint.url,
                isActive: endpoint.isActive,
                consecutiveFails: endpoint.consecutiveFails,
                alertOnConsecutiveFails: endpoint.alertOnConsecutiveFails
            }
        });
    } catch (error) {
        console.error('[MetricsController] Get metrics summary error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics summary.' });
    }
};

export const getAlertsHistory = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        
        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }

        const limit = parseIntParam(req.query.limit as string, 10, 1, 50);

        const alerts = await prisma.alert.findMany({
            where: { endpointId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                status: true,
                message: true,
                createdAt: true,
                resolvedAt: true
            }
        });

        res.status(200).json({
            endpointId,
            limit,
            alerts
        });
    } catch (error) {
        console.error('[MetricsController] Get alerts history error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts history.' });
    }
};