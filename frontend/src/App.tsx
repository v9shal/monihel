import { AppRouter } from "./router/AppRouter";
import { Toaster } from "react-hot-toast";
import React,{ useEffect} from "react";
import { useAppDispatch } from "./app/hooks";
import { checkAuthStatus } from "./features/auth/authSlice";
function App(){
  const dispatch=useAppDispatch();
  useEffect(()=>{
    dispatch(checkAuthStatus());
  },[dispatch])
  return (
    <>
    <AppRouter/>
    <Toaster position="bottom-right"/>
    </>
  )
}
export default App;