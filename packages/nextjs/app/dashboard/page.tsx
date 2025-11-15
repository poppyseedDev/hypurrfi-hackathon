'use client';

import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, formatEther } from 'viem';
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contracts';
import Link from 'next/link';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  // Read vault position details
  const { data: positionData } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getPositionDetails',
  });

  const { data: vaultShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: totalSupply } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
  });

  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getTotalAssets',
  });

  const handleRebalance = () => {
    writeContract({
      address: VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'rebalance',
    });
  };

  const collateral = positionData ? (positionData as any)[0] : 0n;
  const debt = positionData ? (positionData as any)[1] : 0n;
  const healthFactor = positionData ? (positionData as any)[2] : 0n;

  const leverage = collateral && debt ? Number(collateral) / (Number(collateral) - Number(debt)) : 1;
  const ltv = collateral && debt ? (Number(debt) / Number(collateral)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor your vault position and metrics
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ← Back to Vault
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to view dashboard
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Health Factor Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Health Factor
                  </h2>
                  <p className={`text-5xl font-bold ${
                    Number(healthFactor) < 1.2e18 ? 'text-red-500' :
                    Number(healthFactor) < 1.5e18 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {healthFactor ? Number(formatEther(healthFactor as bigint)).toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {Number(healthFactor) < 1.2e18 ? '⚠️ Low - Rebalance recommended' :
                     Number(healthFactor) < 1.5e18 ? '✅ Healthy' :
                     '✨ Very safe'}
                  </p>
                </div>
                <button
                  onClick={handleRebalance}
                  disabled={isPending}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isPending ? 'Rebalancing...' : 'Rebalance'}
                </button>
              </div>
            </div>

            {/* Position Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Collateral
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${collateral ? (Number(formatUnits(collateral as bigint, 6)) / 1e12).toFixed(2) : '0.00'}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Debt
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${debt ? (Number(formatUnits(debt as bigint, 6)) / 1e12).toFixed(2) : '0.00'}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Effective Leverage
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leverage.toFixed(2)}x
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Current LTV
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {ltv.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Your Position */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Your Position
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Shares</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {vaultShares ? formatEther(vaultShares as bigint) : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ownership</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {vaultShares && totalSupply && Number(totalSupply) > 0
                      ? ((Number(vaultShares) / Number(totalSupply)) * 100).toFixed(2)
                      : '0.00'}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Value (Est.)</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${vaultShares && totalSupply && totalAssets && Number(totalSupply) > 0
                      ? ((Number(vaultShares) / Number(totalSupply)) * Number(totalAssets) / 1e18).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Strategy Parameters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Target Health Factor</span>
                    <span className="font-semibold text-gray-900 dark:text-white">1.30</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Min Health Factor</span>
                    <span className="font-semibold text-gray-900 dark:text-white">1.15</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Max Health Factor</span>
                    <span className="font-semibold text-gray-900 dark:text-white">1.50</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Target LTV</span>
                    <span className="font-semibold text-gray-900 dark:text-white">60%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Max Loop Iterations</span>
                    <span className="font-semibold text-gray-900 dark:text-white">4x</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Interest Rate Mode</span>
                    <span className="font-semibold text-gray-900 dark:text-white">Variable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Indicators */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">
                Risk Management
              </h3>
              <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <p>Auto-rebalancing maintains health factor between 1.15 and 1.50</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <p>Conservative 60% LTV target provides safety margin</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <p>Stablecoin-only exposure minimizes volatility risk</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-400">!</span>
                  <p>If health factor drops below 1.0, position may be liquidated with 8% penalty</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
