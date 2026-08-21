import { defineChain, parseAbi } from "viem";

export const xlayerMainnet = defineChain({
  id: 196,
  name: "X Layer Mainnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer",
    },
  },
});

export const XLAYER_MAINNET_CHAIN_PARAMS = {
  chainId: "0xc4", // 196 in hex
  chainName: "X Layer Mainnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"],
  blockExplorerUrls: ["https://www.oklink.com/xlayer"],
};

export async function promptSwitchOrAddXLayer(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return false;
  }

  const ethereum = (window as any).ethereum;
  const hexChainId = "0xc4";

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    if (
      switchError.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.toLowerCase().includes("unrecognized") ||
      switchError?.message?.toLowerCase().includes("add")
    ) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [XLAYER_MAINNET_CHAIN_PARAMS],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add X Layer Mainnet to wallet:", addError);
        return false;
      }
    }
    return false;
  }
}

export async function watchAssetInWallet(params: {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return false;
  }
  try {
    const success = await (window as any).ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: params.address,
          symbol: params.symbol,
          decimals: params.decimals,
          image: params.image || "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        },
      },
    });
    return !!success;
  } catch (error) {
    console.warn("watchAsset error:", error);
    return false;
  }
}

export const CONTRACT_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
  // X Layer Mainnet (Chain ID 196) Canonical Protocols & Tokens
  196: {
    AAVE_V3_POOL: "0xE3F3Caefdd7180F884c01E57f65Df979Af84f116",
    QUICKSWAP_ROUTER: "0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57",
    OKX_DEX_ROUTER: "0x7c5bEE2a8091C3ef39072f64F18Fac913060AEaF",
    WOKB: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    USDC: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
    USDT: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
    WETH: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
  },
};

export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
]);

// Canonical Aave V3 Pool ABI on X Layer
export const AAVE_V3_POOL_ABI = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
]);

// Canonical QuickSwap V3 Router ABI on X Layer
export const QUICKSWAP_ROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 limitSqrtPrice)) external payable returns (uint256 amountOut)",
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)"
]);

// Wrapped OKB ABI
export const WOKB_ABI = parseAbi([
  "function deposit() external payable",
  "function withdraw(uint256 wad) external",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
]);
