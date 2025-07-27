import apiClient from '../lib/axios';
import type {User}  from '../features/auth/authSlice'

interface LoginCredentials{
    email:string;
    password:string;
}
interface LoginInterface{
    message:string;
    user:User;
}
interface RegisterCredentials{
    name:string;
    email:string;
    password:string;
}
interface RegisterInterface{
    message:string;
    user:User;
}

export const loginApi=async(credentials:LoginCredentials):Promise<LoginInterface>=>{

    const response=await apiClient.post<LoginInterface>('/auth/login',credentials);
    return response.data;
}

export const getProfileApi=async():Promise<LoginInterface>=>{
    const response=await apiClient.get<LoginInterface>('/auth/profile');
    return response.data;
}

export const registerApi=async(Credential:RegisterCredentials):Promise<RegisterInterface>=>{
    const response=await apiClient.post<RegisterInterface>('/auth/register',Credential);
    return response.data;
}