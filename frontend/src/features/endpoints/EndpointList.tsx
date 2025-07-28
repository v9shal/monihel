import {type  Endpoint } from '../../types/index';
import  {EndPointCard}  from './EndpointCard';

interface EndpointListProps {
  endpoints: Endpoint[];
}

export const EndpointList = ({ endpoints }: EndpointListProps) => {
  if (endpoints.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">You are not monitoring any endpoints yet.</p>
        <p className="text-gray-500">Click "Add Endpoint" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {endpoints.map((endpoint) => (
        <EndPointCard key={endpoint.id} endpoint={endpoint} />
      ))}
    </div>
  );
};