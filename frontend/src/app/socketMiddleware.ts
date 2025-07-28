import { type Middleware } from '@reduxjs/toolkit';
import { getSocket } from '../lib/socketService';
import { endpointsUpdated, endpointUpdated } from '../features/endpoints/endpointsSlice';
import { type EndpointMetric, type Endpoint } from '../types/index';
import toast from 'react-hot-toast';

let listenersAttached = false;

export const socketMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  if (action.type === 'auth/login/fulfilled' || action.type === 'auth/register/fulfilled') {
    
    setTimeout(() => {
      const socket = getSocket();
      
      if (socket) {
        
        if (listenersAttached) {
          socket.removeAllListeners();
          listenersAttached = false;
        }
        
        if (!socket.connected) {
          socket.on('connect', () => {
            setupSocketListeners(socket, store);
          });
        } else {
          setupSocketListeners(socket, store);
        }
      } else {
        console.warn('[Socket Middleware] No socket available');
      }
    }, 200); 
  }

  if (action.type === 'auth/logout') {
    const socket = getSocket();
    if (socket) {
      socket.removeAllListeners();
      listenersAttached = false;
    }
  }

  return result;
};

const setupSocketListeners = (socket: any, store: any) => {
  if (listenersAttached) {
    return;
  }


  socket.on('ping-update', (metric: EndpointMetric) => {
 console.log('[Socket Middleware] Received ping-update:', {
      endpointId: metric.endpointId,
      status: metric.status,
      responseTime: metric.responseTimeMs,
      timestamp: metric.timestamp
    });
    store.dispatch(endpointsUpdated([metric]));
  });

  socket.on('endpoint-updated', (endpoint: Endpoint) => {
    console.log('[Socket Middleware] Received endpoint-updated:', {
      id: endpoint.id,
      name: endpoint.name,
      consecutiveFails: endpoint.consecutiveFails,
      latestStatus: endpoint.latestStatus,
      isMuted: endpoint.isMuted,
      isActive: endpoint.isActive
    });
    store.dispatch(endpointUpdated(endpoint));
  });

  socket.on('ping:batch-update', (metrics: EndpointMetric[]) => {
    store.dispatch(endpointsUpdated(metrics));
  });

  socket.on('alert:triggered', (alert: any) => {
     toast.error(`Alert: ${alert.endpoint?.name} is down!`);
  });

  socket.on('alert:resolved', (alert: any) => {
    toast.success(`Resolved: ${alert.endpoint?.name} is back up!`);
  });

  socket.on('connect', () => {
    console.log('[Socket Middleware] Socket connected successfully');
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket Middleware] Socket disconnected:', reason);
    listenersAttached = false;
  });

  socket.on('connect_error', (error: any) => {
    console.error('[Socket Middleware] Socket connection error:', error);
  });

  socket.onAny((eventName: string, ...args: any[]) => {
    console.log(`[Socket Middleware] Received event '${eventName}':`, args);
  });

  listenersAttached = true;
  console.log('[Socket Middleware] Event listeners attached successfully');
};