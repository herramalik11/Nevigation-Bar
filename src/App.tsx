import { useState } from 'react';
import { Home, User, MessageCircle, Camera, Settings2 } from 'lucide-react';
import LiquidNav, { TabData } from './components/LiquidNav';

const tabsData: TabData[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'you', label: 'Profile', icon: User },
  { id: 'chat', label: 'Messages', icon: MessageCircle },
  { id: 'shot', label: 'Camera', icon: Camera },
  { id: 'tune', label: 'Settings', icon: Settings2 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="relative min-h-[100svh] flex flex-col items-center justify-center gap-[clamp(34px,7vh,74px)] p-[clamp(28px,6vh,64px)_20px_calc(clamp(28px,7vh,72px)+env(safe-area-inset-bottom))] overflow-x-hidden text-[#f6f2f8]">
      
      {/* Ambient backgrounds */}
      <div className="bloom" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>

      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-[640px]">
        <LiquidNav 
          tabs={tabsData} 
          activeTabIndex={activeTab} 
          onTabSelect={setActiveTab} 
        />
      </main>
    </div>
  );
}
