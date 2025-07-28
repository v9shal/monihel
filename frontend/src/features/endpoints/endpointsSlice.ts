import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { type RootState } from '../../app/store';
import { type NewEndpointData, fetchEndPointApi, createEndPoint, pauseEndPoint, deleteEndpoint, resumeEndpoint } from '../../api/endpointApi';
import { type EndpointMetric, type Endpoint } from '../../types';

interface EndpointsState {
  items: Endpoint[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: EndpointsState = {
  items: [],
  status: 'idle', 
  error: null,
};

export const fetchEndpoints = createAsyncThunk('endpoints/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const endpoints = await fetchEndPointApi();
    return endpoints;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch endpoints');
  }
});

export const createEndpoint = createAsyncThunk('endpoints/create', async (newEndpoint: NewEndpointData, { rejectWithValue }) => {
  try {
    const endpoint = await createEndPoint(newEndpoint);
    return endpoint;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || 'Failed to create endpoint');
  }
});

export const pauseendpoint = createAsyncThunk('endpoints/pause', async (id: number, { rejectWithValue }) => {
  try {
    const endpoint = await pauseEndPoint(id);
    return endpoint;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || 'Failed to pause endpoint');
  }
});

export const deleteEndPoint = createAsyncThunk('endpoints/deleteEndPoint', async (id: number, { rejectWithValue }) => {
  try {
    await deleteEndpoint(id);
    return id;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || 'Failed to delete endpoint');
  }
});

export const resume = createAsyncThunk('endpoints/resume', async (id: number, { rejectWithValue }) => {
  try {
    const endpoint = await resumeEndpoint(id);
    return endpoint;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || 'Failed to resume endpoint');
  }
});

export const endpointsSlice = createSlice({
  name: 'endpoints',
  initialState,
  reducers: {
    endpointsUpdated: (state, action: PayloadAction<EndpointMetric[]>) => {
      const metrics = action.payload;
      
      const metricsMap = new Map<number, EndpointMetric>();
      metrics.forEach(metric => {
        metricsMap.set(metric.endpointId, metric);
      });
      
      state.items.forEach(endpoint => {
        const metric = metricsMap.get(endpoint.id);
        if (metric) {
          endpoint.latestStatus = metric.status;
          endpoint.latestResponseTime = metric.responseTimeMs;
          endpoint.latestTimestamp = metric.timestamp;
        }
      });
    },
    
    endpointUpdated: (state, action: PayloadAction<Endpoint>) => {
      const updatedEndpoint = action.payload;
      const index = state.items.findIndex(endpoint => endpoint.id === updatedEndpoint.id);
      
      if (index !== -1) {
        state.items[index] = updatedEndpoint;
        console.log(`[Redux] Updated endpoint ${updatedEndpoint.id} - consecutiveFails: ${updatedEndpoint.consecutiveFails}, status: ${updatedEndpoint.latestStatus}`);
      } else {
        console.warn(`[Redux] Endpoint ${updatedEndpoint.id} not found in state, adding it`);
        state.items.push(updatedEndpoint);
      }
    },
    
    singleMetricUpdate: (state, action: PayloadAction<EndpointMetric>) => {
      const metric = action.payload;
      const endpoint = state.items.find(ep => ep.id === metric.endpointId);
      
      if (endpoint) {
        endpoint.latestStatus = metric.status;
        endpoint.latestResponseTime = metric.responseTimeMs;
        endpoint.latestTimestamp = metric.timestamp;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEndpoints.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEndpoints.fulfilled, (state, action: PayloadAction<Endpoint[]>) => {
        state.status = 'succeeded';
        state.items = action.payload; 
        state.error = null;
      })
      .addCase(fetchEndpoints.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createEndpoint.pending, (state) => {
        state.error = null;
      })
      .addCase(createEndpoint.fulfilled, (state, action: PayloadAction<Endpoint>) => {
        state.items.unshift(action.payload); 
        state.error = null;
      })
      .addCase(createEndpoint.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(pauseendpoint.fulfilled, (state, action: PayloadAction<Endpoint>) => {
        const index = state.items.findIndex(endpoint => endpoint.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(pauseendpoint.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteEndPoint.fulfilled, (state, action: PayloadAction<number>) => {
        const endpointId = action.payload;
        state.items = state.items.filter(endpoint => endpoint.id !== endpointId);
      })
      .addCase(deleteEndPoint.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(resume.fulfilled, (state, action: PayloadAction<Endpoint>) => {
        const index = state.items.findIndex(endpoint => endpoint.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(resume.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const selectAllEndpoints = (state: RootState) => state.endpoints.items;
export const selectEndpointsStatus = (state: RootState) => state.endpoints.status;
export const selectEndpointsError = (state: RootState) => state.endpoints.error;

export const selectEndpointById = (state: RootState, endpointId: number) => 
  state.endpoints.items.find(endpoint => endpoint.id === endpointId);

export const { endpointsUpdated, endpointUpdated, singleMetricUpdate } = endpointsSlice.actions;
export default endpointsSlice.reducer;