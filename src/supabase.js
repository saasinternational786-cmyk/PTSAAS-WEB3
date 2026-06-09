import { createClient } from '@supabase/supabase-js';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// 1. Secure Environment Config Setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-fallback-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Multi-Wallet Multi-Chain Web3Modal Engine Setup
const mainnet = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || 'bDA0NQbejxa9L0QokVikw'}`
};

const metadata = {
  name: 'PTSAAS WEB3 OTC Platform',
  description: 'Secure Institutional OTC Exchange Platform',
  url: 'https://ptsaasweb3.com',
  icons: ['https://ptsaasweb3.com/favicon.ico']
};

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet],
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '8ee367f0f62e846067b5f5827367c331',
  enableAnalytics: false
});