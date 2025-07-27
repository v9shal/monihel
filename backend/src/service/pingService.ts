import axios, { AxiosError } from 'axios';

export interface PingResult {
    status: 'UP' | 'DOWN' | 'TIMEOUT';
    responseTimeMs: number;
    statusCode: number;
    errorMessage?: string;
}

export async function pingEndpoint(url: string): Promise<PingResult> {
    const startTime = Date.now();
    
    console.log(`[PingService] Starting ping for: ${url}`);
    
    try {
        const response = await axios.get(url, { 
            timeout: 10000, 
            validateStatus: function (status) {
                return status < 500;
            },
            headers: {
                'User-Agent': 'API-Monitor/1.0'
            },
            maxRedirects: 5,
            httpsAgent: process.env.NODE_ENV === 'development' ? 
                require('https').Agent({ rejectUnauthorized: false }) : undefined
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(` Response for ${url}: Status ${response.status}, Time: ${responseTime}ms`);
        
        const status = response.status < 400 ? 'UP' : 'DOWN';
        
        return {
            status,
            responseTimeMs: responseTime,
            statusCode: response.status,
        };
        
    } catch (error: any) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`[PingService] Error for ${url}:`, error.message);
        
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            
            if (axiosError.response) {
                console.log(`[PingService] Server error for ${url}: ${axiosError.response.status}`);
                return {
                    status: 'DOWN',
                    responseTimeMs: responseTime,
                    statusCode: axiosError.response.status,
                    errorMessage: `HTTP ${axiosError.response.status}`
                };
            } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
                console.log(`[PingService] Timeout for ${url}: ${axiosError.message}`);
                return {
                    status: 'TIMEOUT',
                    responseTimeMs: responseTime,
                    statusCode: 0,
                    errorMessage: 'Request timeout'
                };
            } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
                console.log(`[PingService] Connection error for ${url}: ${axiosError.message}`);
                return {
                    status: 'DOWN',
                    responseTimeMs: responseTime,
                    statusCode: 0,
                    errorMessage: axiosError.code || 'Connection failed'
                };
            }
        }
        
        console.log(`[PingService] Generic error for ${url}:`, error.message);
        return {
            status: 'DOWN',
            responseTimeMs: responseTime,
            statusCode: 0,
            errorMessage: error.message || 'Unknown error'
        };
    }
}

