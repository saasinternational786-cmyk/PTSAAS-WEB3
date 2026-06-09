import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

const projectId = e902806f64f6c1a82dcc5552f8739d36

const metadata = {
  name: 'PT SAAS WEB3',
  description: 'Future of Blockchain & AI',
  url: 'https://ptsaasweb3.com',
  icons: ['https://ptsaasweb3.com/logo.png']
}

const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  metadata,
  projectId
})