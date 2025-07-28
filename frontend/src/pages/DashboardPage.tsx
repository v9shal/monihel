  import { useState, useEffect } from 'react'; 
  import { useAppDispatch, useAppSelector } from '../app/hooks';
  import { fetchEndpoints, selectAllEndpoints, selectEndpointsStatus } from '../features/endpoints/endpointsSlice';
  import { EndpointList } from '../features/endpoints/EndpointList';
  import { Modal } from '../components/common/Modal'; 
  import { AddEndpointForm } from '../features/endpoints/AddEndpointForm'; 

  export const DashboardPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const dispatch = useAppDispatch();
    const endpoints = useAppSelector(selectAllEndpoints);
    const status = useAppSelector(selectEndpointsStatus);
    const error = useAppSelector((state) => state.endpoints.error);

    useEffect(() => {
      if (status === 'idle') {
        console.log('[Dashboard] Fetching endpoints...');
        dispatch(fetchEndpoints());
      }
    }, [status, dispatch]);

    useEffect(() => {
      const interval = setInterval(() => {
        if (status === 'succeeded') {
          console.log('[Dashboard] Auto-refreshing endpoints...');
          dispatch(fetchEndpoints());
        }
      }, 30000);

      return () => clearInterval(interval);
    }, [status, dispatch]);

    let content;
    
    if (status === 'loading') {
      content = (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your endpoints...</p>
        </div>
      );
    } else if (status === 'succeeded') {
      content = <EndpointList endpoints={endpoints} />;
    } else if (status === 'failed') {
      content = (
        <div className="text-center py-12">
          <p className="text-red-400">Failed to load endpoints: {error}</p>
          <button 
            onClick={() => dispatch(fetchEndpoints())}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <> 
        <div className="bg-gray-900 text-white min-h-screen">
          <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">Your Endpoints</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Monitoring {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                </p>
              </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  + Add Endpoint
                </button>
              </div>
            </div>
            
            <div className="mb-4 text-sm text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
              {status === 'loading' && <span className="ml-2 text-yellow-400">Updating...</span>}
            </div>
            
            {content}
          </div>
        
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Add New Endpoint"
        >
          <AddEndpointForm onClose={() => setIsModalOpen(false)} />
        </Modal>

      </>
    );
  };