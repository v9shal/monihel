
import { useState, type FormEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { createEndpoint } from './endpointsSlice';
import toast from 'react-hot-toast'; 

interface AddEndpointFormProps {
  onClose: () => void; 
}

export const AddEndpointForm = ({ onClose }: AddEndpointFormProps) => {
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name || !url) {
        toast.error('Name and URL are required.');
        return;
    }

    try {
      await dispatch(createEndpoint({ name, url })).unwrap();
      toast.success('Endpoint created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(`Failed to create endpoint: ${error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-300">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., My Production API"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="url" className="block mb-2 text-sm font-medium text-gray-300">URL</label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://api.example.com/health"
        />
      </div>
      <div className="flex justify-end space-x-4">
        <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold"
        >
            Cancel
        </button>
        <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
            Create Endpoint
        </button>
      </div>
    </form>
  );
};