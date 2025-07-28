import { Request, Response } from 'express';
import prisma from "../../config/prisma.js";
import { pingQueue } from "../../config/bullmq.js";
import { getUserEndpoint, parseIntParam, isValidUrl } from '../../utils/endpointUtils.js';

export const createEndPoint = async (req: Request, res: Response) => {
    try {
        const { url, name, checkIntervalSec, alertOnConsecutiveFails } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!isValidUrl(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const parsedInterval = parseIntParam(checkIntervalSec?.toString(), 60, 30, 3600); // 30 seconds to 1 hour
        const parsedAlertThreshold = parseIntParam(alertOnConsecutiveFails?.toString(), 4, 1, 20); // 1 to 20 failures

        const userId = req.user!.id;

        const newEndpoint = await prisma.endpoint.create({
            data: {
                url,
                name: name || url,
                userId,
                checkIntervalSec: parsedInterval,
                alertOnConsecutiveFails: parsedAlertThreshold
            }
        });

        await pingQueue.add('ping-job',
            { endpointId: newEndpoint.id, url: newEndpoint.url },
            { 
                repeat: { every: newEndpoint.checkIntervalSec * 1000 }, 
                jobId: `endpoint-${newEndpoint.id}` 
            }
        );

        res.status(201).json(newEndpoint);
    } catch (error: any) {
        console.error('[EndpointController] Create endpoint error:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'This URL is already monitored for this user.' });
        }
        
        res.status(500).json({ error: 'Failed to create endpoint.' });
    }
};

export const pauseEndPoint = async (req: Request, res: Response) => {
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

        const jobId = `endpoint-${endpointId}`;
        
        try {
            const removed = await pingQueue.removeJobScheduler(jobId);
            console.log(`[EndpointController] ${removed ? 'Removed' : 'Could not find'} job pattern ${jobId}`);
        } catch (queueError) {
            console.warn('[EndpointController] Error removing job from queue:', queueError);
        }

        const updatedEndpoint = await prisma.endpoint.update({
            where: { id: endpointId },
            data: { isActive: false },
        });

        res.status(200).json(updatedEndpoint);
    } catch (error) {
        console.error('[EndpointController] Pause endpoint error:', error);
        res.status(500).json({ error: 'Failed to pause endpoint.' });
    }
};

export const resumeEndpoint = async (req: Request, res: Response) => {
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

        const updatedEndpoint = await prisma.endpoint.update({
            where: { id: endpointId },
            data: { isActive: true },
        });

        try {
            await pingQueue.add('ping-job',
                { endpointId: updatedEndpoint.id, url: updatedEndpoint.url },
                { 
                    repeat: { every: updatedEndpoint.checkIntervalSec * 1000 }, 
                    jobId: `endpoint-${updatedEndpoint.id}` 
                }
            );
        } catch (queueError) {
            console.error('[EndpointController] Error adding job to queue:', queueError);
            await prisma.endpoint.update({
                where: { id: endpointId },
                data: { isActive: false },
            });
            return res.status(500).json({ error: 'Failed to resume monitoring.' });
        }

        res.status(200).json(updatedEndpoint);
    } catch (error) {
        console.error('[EndpointController] Resume endpoint error:', error);
        res.status(500).json({ error: 'Failed to resume endpoint.' });
    }
};

export const getAllEndpoints = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        
        const endpoints = await prisma.endpoint.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        notificationChannels: {
                            select: {
                                id: true,
                                type: true,
                                target: true,
                                isDefault: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        metrics: true,
                        alerts: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(endpoints);
    } catch (error) {
        console.error('[EndpointController] Get all endpoints error:', error);
        res.status(500).json({ error: 'Failed to fetch endpoints' });
    }
};

export const getEndpointById = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        
        const endpoint = await prisma.endpoint.findFirst({
            where: { 
                id: endpointId, 
                userId 
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        notificationChannels: true
                    }
                },
                _count: {
                    select: {
                        metrics: true,
                        alerts: true
                    }
                }
            }
        });

        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }

        res.json(endpoint);
    } catch (error) {
        console.error('[EndpointController] Get endpoint by ID error:', error);
        res.status(500).json({ error: 'Failed to fetch endpoint' });
    }
};

export const updateEndpoint = async (req: Request, res: Response) => {
    try {
        const endpointId = parseIntParam(req.params.id, 0);
        
        if (endpointId === 0) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

        const userId = req.user!.id;
        const { name, checkIntervalSec, alertOnConsecutiveFails } = req.body;

        const endpoint = await getUserEndpoint(endpointId, userId);
        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found or access denied.' });
        }
        const updateData: any = {};
        
        if (name !== undefined) {
            updateData.name = name;
        }
        
        if (checkIntervalSec !== undefined) {
            updateData.checkIntervalSec = parseIntParam(checkIntervalSec.toString(), endpoint.checkIntervalSec, 30, 3600);
        }
        
        if (alertOnConsecutiveFails !== undefined) {
            updateData.alertOnConsecutiveFails = parseIntParam(alertOnConsecutiveFails.toString(), endpoint.alertOnConsecutiveFails, 1, 20);
        }

        const updatedEndpoint = await prisma.endpoint.update({
            where: { id: endpointId },
            data: updateData
        });

        if (updateData.checkIntervalSec && endpoint.isActive) {
            const jobId = `endpoint-${endpointId}`;
            
            try {
                await pingQueue.removeJobScheduler(jobId);
                
                await pingQueue.add('ping-job',
                    { endpointId: updatedEndpoint.id, url: updatedEndpoint.url },
                    { 
                        repeat: { every: updatedEndpoint.checkIntervalSec * 1000 }, 
                        jobId: jobId
                    }
                );
            } catch (queueError) {
                console.warn('[EndpointController] Error updating job schedule:', queueError);
            }
        }

        res.json(updatedEndpoint);
    } catch (error) {
        console.error('[EndpointController] Update endpoint error:', error);
        res.status(500).json({ error: 'Failed to update endpoint' });
    }
};

export const deleteEndpoint = async (req: Request, res: Response) => {
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
        const jobId = `endpoint-${endpointId}`;
        try {
            await pingQueue.removeJobScheduler(jobId);
        } catch (queueError) {
            console.warn('[EndpointController] Error removing job from queue:', queueError);
        }

        await prisma.endpoint.delete({
            where: { id: endpointId }
        });

        res.status(200).json({ message: 'Endpoint deleted successfully' });
    } catch (error) {
        console.error('[EndpointController] Delete endpoint error:', error);
        res.status(500).json({ error: 'Failed to delete endpoint' });
    }
};
export const getEndpointMetrics = async (req: Request, res: Response) => {
  try {
    const endpointId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    // Validate endpoint belongs to user
    const endpoint = await prisma.endpoint.findFirst({
      where: { id: endpointId, userId }
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const { range = '1h', limit = '100' } = req.query;
    
    // Calculate time range
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
    };
    
    const startTime = timeRanges[range as keyof typeof timeRanges] || timeRanges['1h'];
    
    const metrics = await prisma.endpointMetric.findMany({
      where: {
        endpointId,
        timestamp: {
          gte: startTime
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: parseInt(limit as string)
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching endpoint metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};