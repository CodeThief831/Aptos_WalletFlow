import React from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import toast from 'react-hot-toast';

const WalletButton = () => {
  const { 
    connected, 
    account, 
    connect, 
    disconnect
  } = useWallet();

  const handleConnect = async () => {
    try {
      if (!connected) {
        await connect("Petra");
        toast.success('Wallet connected successfully!');
      } else {
        await disconnect();
        toast.success('Wallet disconnected');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error(connected ? 'Failed to disconnect wallet' : 'Failed to connect wallet');
    }
  };

  return (
    <button
      onClick={handleConnect}
      className={`btn transition-all duration-200 ${
        connected
          ? 'status-connected'
          : 'btn-primary'
      }`}
    >
      {connected ? (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">Petra Connected</div>
            <div className="text-xs font-mono opacity-80">
              {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 'Connected'}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Connect Petra</span>
        </div>
      )}
    </button>
  );
};

export default WalletButton;
