import prisma from '../config/prisma';
import { alertQueue } from '../config/bullmq';
import { PingResult } from './pingService'; 
import { Endpoint, User, NotificationChannel } from '@prisma/client';

type EndpointWithRelations = Endpoint & {
    user: User & {
        notificationChannels: NotificationChannel[];
    };
};

class AlertingService {

    public async handlePingResult(endpoint: EndpointWithRelations, result: PingResult) {
        console.log(`[AlertingService] Processing result for ${endpoint.url}: Status=${result.status}, ConsecutiveFails=${endpoint.consecutiveFails}, Threshold=${endpoint.alertOnConsecutiveFails}`);
        
        if (result.status === 'DOWN' || result.status === 'TIMEOUT') {
            await this.handleFailure(endpoint, result);
        }
        else if (result.status === 'UP' && endpoint.consecutiveFails > 0) {
            await this.handleRecovery(endpoint, result);
        }
    }

    private async handleFailure(endpoint: EndpointWithRelations, result: PingResult) {
        console.log(`[AlertingService] Handling failure for ${endpoint.url}. Current fails: ${endpoint.consecutiveFails}`);
        
        const updatedEndpoint = await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: { consecutiveFails: { increment: 1 } },
        });

        console.log(`[AlertingService] Updated consecutive fails to: ${updatedEndpoint.consecutiveFails}/${updatedEndpoint.alertOnConsecutiveFails}`);

        const activeAlert = await prisma.alert.findFirst({
            where: { endpointId: endpoint.id, status: 'TRIGGERED' }
        });

        console.log(`[AlertingService] Active alert exists: ${!!activeAlert}`);

        if (updatedEndpoint.consecutiveFails >= updatedEndpoint.alertOnConsecutiveFails && !activeAlert) {
            console.log(`[AlertingService] THRESHOLD REACHED! Triggering alert for ${endpoint.url}`);
            
            if (!endpoint.user.notificationChannels || endpoint.user.notificationChannels.length === 0) {
                console.warn(`[AlertingService] No notification channels configured for user ${endpoint.user.id}!`);
                return;
            }

            const alert = await prisma.alert.create({
                data: {
                    endpointId: endpoint.id,
                    status: 'TRIGGERED',
                    message: `Endpoint is down (Status Code: ${result.statusCode})`
                }
            });
            console.log(`[AlertingService] Alert TRIGGERED for ${endpoint.url}. Alert ID: ${alert.id}`);

            await this.dispatchNotifications(endpoint, 'FAILURE');
        } else {
            console.log(`[AlertingService] No alert triggered. Fails: ${updatedEndpoint.consecutiveFails}/${updatedEndpoint.alertOnConsecutiveFails}, Active alert: ${!!activeAlert}`);
        }
    }

    private async handleRecovery(endpoint: EndpointWithRelations, result: PingResult) {
        console.log(`[AlertingService] Handling recovery for ${endpoint.url}`);
        
        await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: { consecutiveFails: 0 }
        });

        const activeAlert = await prisma.alert.findFirst({
            where: { endpointId: endpoint.id, status: 'TRIGGERED' }
        });
        
        if (activeAlert) {
            await prisma.alert.update({
                where: { id: activeAlert.id },
                data: { status: 'RESOLVED', resolvedAt: new Date() }
            });
            console.log(`[AlertingService] Alert RESOLVED for ${endpoint.url}.`);

            await this.dispatchNotifications(endpoint, 'RECOVERY');
        }
    }

    private async dispatchNotifications(endpoint: EndpointWithRelations, type: 'FAILURE' | 'RECOVERY') {
        console.log(`[AlertingService] Dispatching ${type} notifications for ${endpoint.url}`);
        
        const subject = type === 'FAILURE' 
            ? `ALERT: ${endpoint.name || endpoint.url} is DOWN`
            : `RESOLVED: ${endpoint.name || endpoint.url} is UP Again`;
        
        const body = type === 'FAILURE'
            ? `The endpoint <strong>${endpoint.name}</strong> (${endpoint.url}) has been detected as DOWN at ${new Date().toISOString()}.`
            : `The endpoint <strong>${endpoint.name}</strong> (${endpoint.url}) recovered successfully at ${new Date().toISOString()}.`;

        const emailChannels = endpoint.user.notificationChannels.filter(channel => channel.type === 'EMAIL');
        console.log(`[AlertingService] Found ${emailChannels.length} email channels`);

        for (const channel of emailChannels) {
            try {
                const job = await alertQueue.add('send-email-alert', { 
                    to: channel.target, 
                    subject, 
                    body 
                });
                console.log(`[AlertingService] Queued ${type} email job ${job.id} to ${channel.target}`);
            } catch (error) {
                console.error(`[AlertingService] Failed to queue email job:`, error);
            }
        }
        
        console.log(`[AlertingService] Dispatched ${type} notifications for ${endpoint.url}.`);
    }
}

export const alertingService = new AlertingService();