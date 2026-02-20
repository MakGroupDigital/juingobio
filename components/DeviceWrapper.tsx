
import React from 'react';

interface DeviceWrapperProps {
  children: React.ReactNode;
}

const DeviceWrapper: React.FC<DeviceWrapperProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 p-4">
      <div className="relative w-[393px] h-[852px] bg-black rounded-[55px] shadow-2xl overflow-hidden border-[8px] border-black">
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-9 bg-black rounded-full z-50"></div>
        
        {/* Screen Content */}
        <div className="w-full h-full bg-white overflow-y-auto scrollbar-hide relative">
          {children}
        </div>
        
        {/* Bottom Bar */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/20 rounded-full z-50"></div>
      </div>
    </div>
  );
};

export default DeviceWrapper;
