import React from "react";

interface ModalProps{
    isOpen:boolean;
    onClose:()=>void;
    title:string;
    children:React.ReactNode;
}
export const Modal=({isOpen,onClose,title,children}:ModalProps)=>{
    if(!isOpen)return null;

        return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            × 
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}