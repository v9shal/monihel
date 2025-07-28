import { configureStore } from '@reduxjs/toolkit';
import  authReducer from '../features/auth/authSlice';
import  endpointsReducer from '../features/endpoints/endpointsSlice';
import { socketMiddleware } from './socketMiddleware';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    endpoints: endpointsReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(socketMiddleware),

  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;