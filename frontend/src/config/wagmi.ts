import { http, createConfig, injected } from "wagmi";
import { mainnet } from "viem/chains";
import { xlayerMainnet } from "./xlayer";

export const config = createConfig({
  chains: [xlayerMainnet, mainnet],
  connectors: [injected()],
  transports: {
    [xlayerMainnet.id]: http("https://rpc.xlayer.tech"),
    [mainnet.id]: http(),
  },
  ssr: true,
});
