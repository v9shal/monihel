import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { recreateActiveJobs } from './workers/recreateJobs.js';
import { pingEndpoint } from './service/pingService.js'; 
import { redisPublisher } from './config/bullmq.js'; 
import { authService } from './service/authService.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import apiRoutes from './api/routes/index.js';

const app = express();
const prisma = new PrismaClient();

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['http://localhost', 'http://localhost:80'] 
        : 'http://localhost:5173',
    credentials: true,
};

const http = createServer(app);
const io = new Server(http, {
    cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const userSocketMap = new Map<number, string>();

const subClient = redisPublisher.duplicate();
let isRedisConnected = false;

// Redis connection handling
subClient.on('connect', () => {
    console.log('[Redis Subscriber] Connected successfully');
    isRedisConnected = true;
});

subClient.on('error', (err: any) => {
    console.error('[Redis Subscriber] Connection Error:', err);
    isRedisConnected = false;
});

subClient.on('message', (channel: string, message: string) => {
    console.log(`[Redis Pub/Sub] Received message from channel '${channel}'`);
    
    try {
        const data = JSON.parse(message);
        const userId = parseInt(channel.split(':')[1], 10);
        const socketId = userSocketMap.get(userId);
        
        if (socketId && io.sockets.sockets.has(socketId)) {
            io.to(socketId).emit(data.type, data.payload);
            console.log(`[Socket.IO Gateway] Forwarded event '${data.type}' to socket ${socketId} for user ${userId}`);
        } else {
            console.log(`[Socket.IO Gateway] No active socket for user ${userId}. Message not forwarded.`);
        }
    } catch (error) {
        console.error('[Redis Pub/Sub] Error parsing or forwarding message:', error);
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        console.log(`[Socket.IO] Connection attempt rejected: No token provided.`);
        socket.disconnect();
        return;
    }

    try {
        const userPayload = authService.verifyToken(token);
        if (!userPayload?.id) {
            console.log(`[Socket.IO] Connection attempt rejected: Invalid token.`);
            socket.disconnect();
            return;
        }

        const userId = userPayload.id;
        console.log(`[Socket.IO] Authenticated user ${userId} connected via socket ${socket.id}.`);
        
        userSocketMap.set(userId, socket.id);
        
        const userChannel = `user-events:${userId}`;
        if (isRedisConnected) {
            subClient.subscribe(userChannel);
            console.log(`[Redis Pub/Sub] Subscribed to channel: ${userChannel}`);
        }

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] User ${userId} (socket ${socket.id}) disconnected.`);
            
            userSocketMap.delete(userId);
            
            if (isRedisConnected) {
                subClient.unsubscribe(userChannel);
                console.log(`[Redis Pub/Sub] Unsubscribed from channel: ${userChannel}`);
            }
        });

        socket.on('error', (error) => {
            console.error(`[Socket.IO] Socket error for user ${userId}:`, error);
        });

    } catch (error) {
        console.error('[Socket.IO] Error during authentication:', error);
        socket.disconnect();
    }
});

export const publishToUser = (userId: number, eventType: string, payload: any) => {
    if (!isRedisConnected) {
        console.warn('[Redis Publisher] Redis not connected, skipping publish');
        return;
    }

    const channel = `user-events:${userId}`;
    const message = JSON.stringify({
        type: eventType,
        payload: payload,
    });
    
    redisPublisher.publish(channel, message);
    console.log(`[Redis Publisher] Published '${eventType}' to channel: ${channel}`);
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        
        // Check Redis connection
        const redisStatus = isRedisConnected ? 'connected' : 'disconnected';
        
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            redis: redisStatus,
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
        };

        res.status(200).json(health);
    } catch (error) {
        console.error('[Health Check] Error:', error);
        res.status(503).json({ 
            status: 'error', 
            message: 'Service unhealthy',
            timestamp: new Date().toISOString()
        });
    }
});

const PORT = process.env.PORT || 3000;

app.use('/api', apiRoutes);

app.post('/ping/:id', async (req, res) => {
    try {
        const endpointId = parseInt(req.params.id, 10);
        
        if (isNaN(endpointId)) {
            return res.status(400).json({ error: 'Invalid endpoint ID' });
        }

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

        if (endpoint.userId) {
            publishToUser(endpoint.userId, 'ping-update', metric);
        }

        res.status(200).json({ result, metric });
    } catch (error) {
        console.error('[Server] Ping endpoint error:', error);
        res.status(500).json({ error: 'Failed to execute ping' });
    }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down gracefully');
    
    // Close HTTP server
    http.close(() => {
        console.log('[Server] HTTP server closed');
    });
    
    // Close database connection
    await prisma.$disconnect();
    console.log('[Server] Database connection closed');
    
    // Close Redis connections
    subClient.quit();
    redisPublisher.quit();
    console.log('[Server] Redis connections closed');
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Server] SIGINT received, shutting down gracefully');
    
    // Close HTTP server
    http.close(() => {
        console.log('[Server] HTTP server closed');
    });
    
    // Close database connection
    await prisma.$disconnect();
    console.log('[Server] Database connection closed');
    
    // Close Redis connections
    subClient.quit();
    redisPublisher.quit();
    console.log('[Server] Redis connections closed');
    
    process.exit(0);
});

async function initialize() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('[Server] Database connected successfully');
        
        // Recreate active jobs
        await recreateActiveJobs();
        console.log('[Server] Active jobs recreated');
        
        // Start server
        http.listen(PORT, () => {
            console.log(`[Server] Server is running on http://localhost:${PORT}`);
            console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('[Server] Failed to initialize:', error);
        process.exit(1);
    }
}

initialize();