import { createSlice,createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { connectSocket, disconnectSocket } from '../../lib/socketService';
import type { RootState } from "../../app/store";
import { loginApi ,getProfileApi,registerApi} from '../../api/authApi';

 export  interface User{
    id:number;
    email:string;
    name:string|null;
}
interface AuthState{
    user:User|null;
    isAuthenticated:boolean;
    status:'idle'|'loading'|'succeeded'|'failed';
    error:string|null;
    token:string|null;
}

const initialState:AuthState={
user:null,
isAuthenticated:false,
status:'idle',
token:null,
error:null
}

export const loginUser=createAsyncThunk(
    'auth/login',
    async(Credential:{email:string,password:string},{rejectWithValue})=>{
        try {
            const response=await loginApi(Credential);
            if(response.token){
                connectSocket(response.token);
            }
            return response.user;
        } catch (error:any) {
            return rejectWithValue(error.response.data.error||'Login failed');
        }
    }
)

export const checkAuthStatus=createAsyncThunk(
    'auth/checkStatus',
    async(_,{rejectWithValue})=>{
        try {
            const response=await getProfileApi();
            return response.user
        } catch (error) {
            return rejectWithValue('no active session');
        }
    }
)

export const registeruser=createAsyncThunk(
    'auth/register',
    async(Credential:{name:string,email:string,password:string},{rejectWithValue})=>{
        try {
            const response=await registerApi(Credential);
             if (response.token) {
            connectSocket(response.token);
        }
            return response.user;
        } catch (error:any) {
            return rejectWithValue(error.response.data.error||'failed to register user');
        }
    }
)
export const authSlice=createSlice({
    name:'auth',
    initialState,
    reducers:{
        logout:(state)=>{
            state.isAuthenticated=false;
            state.user=null;
            state.status='idle',
            state.error=null;
            disconnectSocket();
        },
       
    },
    extraReducers:(builder)=>{
        builder
         .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
       .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected,(state,action)=>{
        state.status='failed';
        state.isAuthenticated=false;
        state.user=null;
        state.error=action.payload as string;
      })
      .addCase(checkAuthStatus.pending,(state)=>{state.status='loading'
      })
      .addCase(checkAuthStatus.fulfilled,(state,action:PayloadAction<User>)=>{
        state.isAuthenticated=true;
        state.status='succeeded',
        state.user=action.payload;
      })
      .addCase(checkAuthStatus.rejected,(state)=>{
        state.status='idle'
        state.isAuthenticated=false;
        state.user=null;
      })
      .addCase(registeruser.pending,(state)=>{
        state.status='loading';
        state.isAuthenticated=false;
        state.user=null;
      })
      .addCase(registeruser.fulfilled,(state,action:PayloadAction<User>)=>{
        state.isAuthenticated=true;
        state.status='succeeded';
        state.user=action.payload;
      })
      .addCase(registeruser.rejected,(state,action)=>{
        state.status='failed';
        state.isAuthenticated=false;
        state.user=null;
        state.error=action.payload as string;
      })
    }
});

export const {logout} =authSlice.actions;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export const selectUser=(state:RootState)=>state.auth.user;
export const selectAuthStatus=(state:RootState)=>state.auth.status;
export default authSlice.reducer;