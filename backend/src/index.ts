import express from 'express';
import { PrismaClient } from '@prisma/client';
import { recreateActiveJobs } from './workers/recreateJobs';
import { pingEndpoint } from './service/pingService'; 
import { pingQueue, alertQueue } from './config/bullmq'; 
import cookieParser from 'cookie-parser';
import apiRoutes from './api/routes/index'
const app=express();
const prisma = new PrismaClient();
app.use(express.json());
app.use(cookieParser());


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); 
    res.header('Access-Control-Allow-Credentials', 'true'); 
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});


const PORT = process.env.PORT || 3000;

app.use('/api', apiRoutes);
app.post('/ping/:id', async (req, res) => {
    try {
        const endpointId = parseInt(req.params.id, 10);
        const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } });

        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }

        const result = await pingEndpoint(endpoint.url);

        const metric = await prisma.endpointMetric.create({
            data: {
                timestamp: new Date(),
                responseTimeMs: result.responseTimeMs,
                statusCode: result.statusCode,
                status: result.status,
                endpointId: endpoint.id,
            },
        });

        res.status(200).json({ result, metric });
    } catch (error) {
        console.error('[Server] Ping endpoint error:', error);
        res.status(500).json({ error: 'Failed to execute ping' });
    }
});

app.get('/endpoints', async (req, res) => {
    try {
        const endpoints = await prisma.endpoint.findMany({
            include: {
                user: {
                    include: {
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
        res.json(endpoints);
    } catch (error) {
        console.error('[Server] Error fetching endpoints:', error);
        res.status(500).json({ error: 'Failed to fetch endpoints' });
    }
});
app.get('/debug/check-alert-config', async (req, res) => {
    try {
        const endpoints = await prisma.endpoint.findMany({
            select: {
                id: true,
                url: true,
                consecutiveFails: true,
                alertOnConsecutiveFails: true,
                isActive: true,
                user: {
                    include: {
                        notificationChannels: true
                    }
                }
            }
        });
        
        const summary = endpoints.map(ep => ({
            id: ep.id,
            url: ep.url,
            consecutiveFails: ep.consecutiveFails,
            alertOnConsecutiveFails: ep.alertOnConsecutiveFails,
            isActive: ep.isActive,
            hasNotificationChannels: ep.user?.notificationChannels?.length > 0,
            notificationChannels: ep.user?.notificationChannels?.map(nc => ({
                type: nc.type,
                target: nc.target
            })) || []
        }));
        
        res.json({ 
            message: 'Endpoint alert configuration check',
            endpoints: summary
        });
    } catch (error) {
        console.error('[Debug] Alert config check error:', error);
        res.status(500).json({ error: 'Failed to check alert config' });
    }
});
app.post('/debug/fix-alert-threshold', async (req, res) => {
    try {
        // Update all endpoints that have null or undefined alertOnConsecutiveFails
        const updated = await prisma.endpoint.updateMany({
            where: {
                OR: [
                    { alertOnConsecutiveFails: null },
                    { alertOnConsecutiveFails: undefined },
                    { alertOnConsecutiveFails: 0 }
                ]
            },
            data: { alertOnConsecutiveFails: 4 }
        });
        
        console.log(`[Debug] Updated ${updated.count} endpoints with alertOnConsecutiveFails = 4`);
        
        res.json({ 
            message: `Fixed alert threshold for ${updated.count} endpoints`,
            updatedCount: updated.count
        });
    } catch (error) {
        console.error('[Debug] Fix alert threshold error:', error);
        res.status(500).json({ error: 'Failed to fix alert threshold' });
    }
});

app.get('/alerts', async (req, res) => {
    try {
        const alerts = await prisma.alert.findMany({
            include: {
                endpoint: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });
        res.json(alerts);
    } catch (error) {
        console.error('[Server] Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});





app.post('/debug/fix-null-users', async (req, res) => {
    try {
        // Find default user
        let defaultUser = await prisma.user.findFirst({
            where: { email: 'default@test.com' }
        });
        
        if (!defaultUser) {
            defaultUser = await prisma.user.create({
                data: {
                    email: 'default@test.com',
                    name: 'Default User',
                    password: 'hashed_password_here'
                }
            });
            
            await prisma.notificationChannel.create({
                data: {
                    type: 'EMAIL',
                    target: 'alerts@test.com',
                    isDefault: true,
                    userId: defaultUser.id
                }
            });
        }
        
        // Update all endpoints with null userId
        const updated = await prisma.endpoint.updateMany({
            where: { userId: null },
            data: { userId: defaultUser.id }
        });
        
        res.json({ 
            message: `Fixed ${updated.count} endpoints with null userId`,
            defaultUserId: defaultUser.id 
        });
    } catch (error) {
        console.error('[Debug] Fix null users error:', error);
        res.status(500).json({ error: 'Failed to fix null users' });
    }
});

app.get('/debug/endpoint-status', async (req, res) => {
    try {
        const endpoints = await prisma.endpoint.findMany({
            include: {
                user: {
                    include: {
                        notificationChannels: true
                    }
                },
                metrics: {
                    orderBy: { timestamp: 'desc' },
                    take: 5
                },
                alerts: {
                    where: { status: 'TRIGGERED' }
                }
            }
        });
        
        res.json(endpoints);
    } catch (error) {
        console.error('[Debug] Endpoint status error:', error);
        res.status(500).json({ error: 'Failed to get endpoint status' });
    }
});

app.post('/debug/reset-fails', async (req, res) => {
    try {
        // Reset consecutive fails
        const updatedEndpoints = await prisma.endpoint.updateMany({
            data: { consecutiveFails: 0 }
        });
        
        // Resolve all triggered alerts
        const resolvedAlerts = await prisma.alert.updateMany({
            where: { status: 'TRIGGERED' },
            data: { 
                status: 'RESOLVED',
                resolvedAt: new Date()
            }
        });
        
        res.json({ 
            message: 'Reset completed',
            endpointsReset: updatedEndpoints.count,
            alertsResolved: resolvedAlerts.count
        });
    } catch (error) {
        console.error('[Debug] Reset fails error:', error);
        res.status(500).json({ error: 'Failed to reset fails' });
    }
});

app.post('/debug/test-endpoint/:id', async (req, res) => {
    try {
        const endpointId = parseInt(req.params.id, 10);
        const endpoint = await prisma.endpoint.findUnique({ 
            where: { id: endpointId } 
        });

        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }

        console.log(`[Debug] Testing endpoint ${endpointId}: ${endpoint.url}`);
        
        const result = await pingEndpoint(endpoint.url);
        
        console.log(`[Debug] Result:`, result);
        
        res.json({ 
            endpoint,
            result,
            message: 'Test completed. Check console for detailed logs.'
        });
    } catch (error) {
        console.error('[Debug] Test endpoint error:', error);
        res.status(500).json({ error: 'Failed to test endpoint' });
    }
});

app.get('/debug/queue-status', async (req, res) => {
    try {
        const pingQueueJobs = await pingQueue.getJobSchedulers();
        const alertQueueWaiting = await alertQueue.getWaiting();
        const alertQueueActive = await alertQueue.getActive();
        const alertQueueCompleted = await alertQueue.getCompleted();
        const alertQueueFailed = await alertQueue.getFailed();
        
        res.json({
            pingQueue: {
                scheduledJobs: pingQueueJobs.length,
                jobs: pingQueueJobs
            },
            alertQueue: {
                waiting: alertQueueWaiting.length,
                active: alertQueueActive.length,
                completed: alertQueueCompleted.length,
                failed: alertQueueFailed.length
            }
        });
    } catch (error) {
        console.error('[Debug] Queue status error:', error);
        res.status(500).json({ error: 'Failed to get queue status' });
    }
});

async function initialize() {
    try {
        await recreateActiveJobs();
        
        app.listen(PORT, () => {
            console.log(`[Server] Server is running on http://localhost:${PORT}`);
            
        });
    } catch (error) {
        console.error('[Server] Failed to initialize:', error);
        process.exit(1);
    }
}

initialize();