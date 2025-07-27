import React,{useState,type FormEvent} from "react";
import { useAppDispatch,useAppSelector } from "../app/hooks";
import { loginUser,selectAuthStatus,selectUser } from "../features/auth/authSlice";
import {Navigate } from 'react-router-dom';

import { selectIsAuthenticated } from '../features/auth/authSlice';


export const LoginPage=()=>{
    const [email,setEmail]=useState('');
    const[password,setPassword]=useState('');

    const dispatch=useAppDispatch();
    const authStatus=useAppSelector(selectAuthStatus);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const handleSubmit=(event:FormEvent)=>{
        event.preventDefault();
        dispatch(loginUser({email,password}));
    }
    if(isAuthenticated){
        return <Navigate to={'/dashboard'}/>
    }
    return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="p-8 max-w-md w-full bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              id="email"
              value={email} // Controlled component: value is tied to state
              onChange={(e) => setEmail(e.target.value)} // Update state on change
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              id="password"
              value={password} // Controlled component: value is tied to state
              onChange={(e) => setPassword(e.target.value)} // Update state on change
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={authStatus === 'loading'} // Disable button while logging in
          >
            {authStatus === 'loading' ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}