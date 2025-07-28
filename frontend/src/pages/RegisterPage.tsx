import {useState,type FormEvent} from "react";
import { useAppDispatch,useAppSelector } from "../app/hooks";
import { registeruser } from "../features/auth/authSlice";
import { Link, Navigate } from "react-router-dom";
import { selectIsAuthenticated,selectAuthStatus } from '../features/auth/authSlice';
export const RegisterPage = () => { 
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authStatus = useAppSelector(selectAuthStatus);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(registeruser({ name, email, password }));
  };

  if (isAuthenticated) {
    return <Navigate to={'/dashboard'} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="p-8 max-w-md w-full bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6">Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-300">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={authStatus === 'loading'}
          >
            {authStatus === 'loading' ? 'Creating Account...' : 'Register'}
          </button>
          <p className="text-center mt-4 text-sm text-gray-400">
            Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}