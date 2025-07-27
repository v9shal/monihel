import prisma from "../config/prisma";
import { pingQueue } from "../config/bullmq";
 export async function recreateActiveJobs() {
    try {
        console.log('[Server] Recreating jobs for active endpoints...');
        
        const activeEndpoints = await prisma.endpoint.findMany({
            where: { isActive: true },
            include: {
                user: {
                    include: {
                        notificationChannels: true
                    }
                }
            }
        });
        
        console.log(`[Server] Found ${activeEndpoints.length} active endpoints`);
        
        for (const endpoint of activeEndpoints) {
            if (!endpoint.user || !endpoint.user.notificationChannels || endpoint.user.notificationChannels.length === 0) {
                console.warn(`[Server] Endpoint ${endpoint.id} has no notification channels - alerts may not work`);
            }
            
            await pingQueue.add(
                'ping-job',
                {
                    endpointId: endpoint.id,
                    url: endpoint.url,
                },
                {
                    repeat: { every: 60 * 1000 },
                    jobId: `endpoint-${endpoint.id}`
                }
            );
            console.log(`[Server] Recreated job for endpoint ${endpoint.id}: ${endpoint.url}`);
        }
        
        console.log('[Server] All active jobs recreated successfully');
    } catch (error) {
        console.error('[Server] Error recreating jobs:', error);
    }
}
