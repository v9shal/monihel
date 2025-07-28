import  { useState } from "react";
import { type Endpoint } from "../../types";
import { useAppDispatch } from '../../app/hooks'; 
import { pauseendpoint, deleteEndPoint, resume } from './endpointsSlice'; 
import { EndpointChart } from './EndpointChart';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface EndpointCardProps {
    endpoint: Endpoint;
}

export const EndPointCard = ({ endpoint }: EndpointCardProps) => {
  const dispatch = useAppDispatch();
  const [showChart, setShowChart] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusColor = () => {
    if (!endpoint.latestStatus) return 'bg-gray-500';
    
    switch (endpoint.latestStatus) {
      case 'UP':
        return 'bg-green-500';
      case 'DOWN':
        return 'bg-red-500';
      case 'TIMEOUT':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (!endpoint.latestStatus) return 'Unknown';
    return endpoint.latestStatus;
  };

  const getStatusTextColor = () => {
    if (!endpoint.latestStatus) return 'text-gray-400';
    
    switch (endpoint.latestStatus) {
      case 'UP':
        return 'text-green-400';
      case 'DOWN':
        return 'text-red-400';
      case 'TIMEOUT':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const handlePause = () => {
    toast.promise(
      dispatch(pauseendpoint(endpoint.id)).unwrap(),
      {
        loading: `Pausing ${endpoint.name}...`,
        success: <b>Endpoint paused successfully!</b>,
        error: <b>Could not pause endpoint.</b>,
      }
    );
  };

  const handleResume = () => {
    toast.promise(
      dispatch(resume(endpoint.id)).unwrap(),
      {
        loading: `Resuming ${endpoint.name}...`,
        success: <b>Endpoint resumed successfully!</b>,
        error: <b>Could not resume endpoint.</b>,
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${endpoint.name}"?`)) {
      toast.promise(
        dispatch(deleteEndPoint(endpoint.id)).unwrap(),
        {
          loading: `Deleting ${endpoint.name}...`,
          success: <b>Endpoint deleted successfully!</b>,
          error: <b>Could not delete endpoint.</b>,
        }
      );
    }
  };

  const formatUptime = () => {
    const createdAt = new Date(endpoint.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="flex items-center mr-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2 animate-pulse`}></div>
              <span className={`text-xs uppercase font-semibold ${getStatusTextColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{endpoint.name}</h3>
                {!endpoint.isActive && (
                  <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 break-all">{endpoint.url}</p>
              
              <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-4">
                <span>
                  Last Check: {endpoint.latestTimestamp 
                    ? new Date(endpoint.latestTimestamp).toLocaleTimeString() 
                    : 'N/A'}
                </span>
                <span>
                  Response: {endpoint.latestResponseTime 
                    ? `${endpoint.latestResponseTime}ms` 
                    : 'N/A'}
                </span>
                <span className={`${endpoint.consecutiveFails > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  Failures: {endpoint.consecutiveFails}/{endpoint.alertOnConsecutiveFails}
                </span>
                <span className="text-blue-400">
                  Uptime: {formatUptime()}
                </span>
                <span className="text-purple-400">
                  Interval: {endpoint.checkIntervalSec}s
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChart(!showChart)}
              className={`p-2 rounded-md transition-colors ${
                showChart 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Chart"
            >
              <BarChart3 size={16} />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
              title="Toggle Details"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {endpoint.isActive ? (
              <button 
                onClick={handlePause}
                className="text-sm bg-gray-600 hover:bg-gray-500 text-white py-1 px-3 rounded-md transition-colors"
              >
                Pause
              </button>
            ) : (
              <button 
                onClick={handleResume}
                className="text-sm bg-green-600 hover:bg-green-500 text-white py-1 px-3 rounded-md transition-colors"
              >
                Resume
              </button>
            )}

            <button 
              onClick={handleDelete}
              className="text-sm bg-red-600 hover:bg-red-500 text-white py-1 px-3 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Created:</span>
                <p className="text-white">{new Date(endpoint.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-400">Alert Threshold:</span>
                <p className="text-white">{endpoint.alertOnConsecutiveFails} failures</p>
              </div>
              <div>
                <span className="text-gray-400">Muted:</span>
                <p className={endpoint.isMuted ? 'text-yellow-400' : 'text-green-400'}>
                  {endpoint.isMuted ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className={endpoint.isActive ? 'text-green-400' : 'text-yellow-400'}>
                  {endpoint.isActive ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      
      {showChart && (
        <div className="border-t border-gray-700">
          <div className="p-4">
            <EndpointChart endpoint={endpoint} />
          </div>
        </div>
      )}
    </div>
  );
};