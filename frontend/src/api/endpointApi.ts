import apiClient from "../lib/axios";
import { type Endpoint } from '../types'; 

export interface NewEndpointData {
    name: string;
    url: string;
    checkIntervalSec?: number;
}

export const fetchEndPointApi = async (): Promise<Endpoint[]> => {
    const response = await apiClient.get<Endpoint[]>('/endpoint');
    return response.data;
};

export const createEndPoint = async (endpointData: NewEndpointData): Promise<Endpoint> => {
    const response = await apiClient.post<Endpoint>('/endpoint', endpointData);
    return response.data;
};

export const pauseEndPoint = async (id: number): Promise<Endpoint> => {
    const response = await apiClient.post<Endpoint>(`/endpoint/${id}/pause`);
    return response.data;
};

export const deleteEndpoint = async (id: number): Promise<Endpoint> => {
    const response = await apiClient.delete<Endpoint>(`/endpoint/${id}`);
    return response.data;
};

export const resumeEndpoint = async (id: number): Promise<Endpoint> => {
    const response = await apiClient.post<Endpoint>(`/endpoint/${id}/resume`); 
    return response.data;
};