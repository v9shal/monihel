import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const apiClient=axios.create({
    baseURL:baseURL,
    withCredentials:true,
})
export default apiClient