import React, { createContext, useContext } from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';

const wallets = [new PetraWallet()];

const WalletContext = createContext({});

export const WalletProvider = ({ children }) => {
  return (
    <AptosWalletAdapterProvider plugins={wallets} autoConnect={true}>
      <WalletContext.Provider value={{}}>
        {children}
      </WalletContext.Provider>
    </AptosWalletAdapterProvider>
  );
};

export const useWallet = () => {
  return useContext(WalletContext);
};
