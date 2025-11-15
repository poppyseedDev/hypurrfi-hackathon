'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/contracts';

export default function Home() {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read vault data
  const { data: vaultShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: healthFactor } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getHealthFactor',
  });

  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getTotalAssets',
  });

  const handleDeposit = async () => {
    if (!depositAmount) return;

    try {
      // First approve USDC
      writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS as `0x${string}`, parseUnits(depositAmount, 6)],
      });

      // Then deposit (in real app, wait for approval first)
      setTimeout(() => {
        writeContract({
          address: VAULT_ADDRESS as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [parseUnits(depositAmount, 6)],
        });
      }, 2000);
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawShares) return;

    try {
      writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseUnits(withdrawShares, 18)],
      });
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                HypurrFi Stable Yield Vault
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Leveraged stablecoin yield loops on HyperEVM
              </p>
            </div>

            {/* Wallet Connection */}
            {isConnected ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    USDC: {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'}
                  </p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vault Stats */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Vault Stats
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Value Locked</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${totalAssets ? (Number(formatUnits(totalAssets as bigint, 6)) / 1e12).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Health Factor</p>
                  <p className={`text-xl font-bold ${healthFactor && Number(healthFactor) < 1.2e18 ? 'text-red-500' : 'text-green-500'}`}>
                    {healthFactor ? (Number(formatUnits(healthFactor as bigint, 18))).toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your Shares</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {vaultShares ? formatUnits(vaultShares as bigint, 18) : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How it works</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li>• Deposit stablecoins (USDC)</li>
                <li>• Vault supplies to HypurrFi</li>
                <li>• Borrows USDXL at 60% LTV</li>
                <li>• Re-supplies USDXL (loops 4x)</li>
                <li>• Earns compounding yield</li>
                <li>• Auto-rebalances health factor</li>
              </ul>
            </div>
          </div>

          {/* Deposit/Withdraw Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'deposit'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Deposit Tab */}
              {activeTab === 'deposit' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount (USDC)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-3 text-gray-500 dark:text-gray-400">
                        USDC
                      </span>
                    </div>
                    {usdcBalance && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Balance: {formatUnits(usdcBalance as bigint, 6)} USDC
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={!isConnected || isPending || isConfirming || !depositAmount}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Deposit'}
                  </button>

                  {isConfirmed && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        ✅ Deposit successful! Transaction: {hash?.slice(0, 10)}...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Withdraw Tab */}
              {activeTab === 'withdraw' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shares to Withdraw
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={withdrawShares}
                        onChange={(e) => setWithdrawShares(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-3 text-gray-500 dark:text-gray-400">
                        Shares
                      </span>
                    </div>
                    {vaultShares && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Your shares: {formatUnits(vaultShares as bigint, 18)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={!isConnected || isPending || isConfirming || !withdrawShares}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Withdraw'}
                  </button>

                  {isConfirmed && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        ✅ Withdrawal successful! Transaction: {hash?.slice(0, 10)}...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <a
                href="/dashboard"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <p className="font-medium text-gray-900 dark:text-white">📊 Dashboard</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">View detailed metrics</p>
              </a>
              <a
                href="https://docs.hypurr.fi"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <p className="font-medium text-gray-900 dark:text-white">📚 Docs</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Learn more</p>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
