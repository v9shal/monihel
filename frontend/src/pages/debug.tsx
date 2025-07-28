import  { useEffect, useState } from 'react';
import { getSocket } from '../lib/socketService';

export const SocketDebugPanel = () => {
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connected' | 'connecting'>('disconnected');
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; timestamp: Date } | null>(null);
  const [eventHistory, setEventHistory] = useState<Array<{ type: string; data: any; timestamp: Date }>>([]);

  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) {
      setSocketStatus('disconnected');
      return;
    }

    const updateStatus = () => {
      if (socket.connected) {
        setSocketStatus('connected');
      } else if (socket.connect()) {
        setSocketStatus('connecting');
      } else {
        setSocketStatus('disconnected');
      }
    };

    updateStatus();

    const handleAnyEvent = (eventName: string, ...args: any[]) => {
      const eventData = { type: eventName, data: args, timestamp: new Date() };
      setLastEvent(eventData);
      setEventHistory(prev => [eventData, ...prev.slice(0, 9)]); 
    };

    socket.onAny(handleAnyEvent);
    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);
    socket.on('connecting', () => setSocketStatus('connecting'));

    return () => {
      socket.offAny(handleAnyEvent);
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
    };
  }, []);

  const getStatusColor = () => {
    switch (socketStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  const testManualPing = async (endpointId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/ping/${endpointId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();
      console.log('Manual ping result:', result);
    } catch (error) {
      console.error('Manual ping failed:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-md text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Socket Debug</h3>
        <div className={`text-xs ${getStatusColor()}`}>
          ● {socketStatus.toUpperCase()}
        </div>
      </div>
      
      {lastEvent && (
        <div className="mb-2">
          <div className="text-xs text-gray-400">Last Event:</div>
          <div className="text-xs text-green-400">{lastEvent.type}</div>
          <div className="text-xs text-gray-500">{lastEvent.timestamp.toLocaleTimeString()}</div>
        </div>
      )}

      <div className="mb-2">
        <button 
          onClick={() => testManualPing(1)} 
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        >
          Test Ping ID:1
        </button>
      </div>

      <details className="text-xs">
        <summary className="text-gray-400 cursor-pointer">Event History</summary>
        <div className="mt-1 max-h-32 overflow-y-auto">
          {eventHistory.map((event, index) => (
            <div key={index} className="text-gray-500 border-b border-gray-700 py-1">
              <div className="text-green-400">{event.type}</div>
              <div>{event.timestamp.toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};