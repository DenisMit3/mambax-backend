'use client';

import React, { useEffect, useState } from 'react';
import { advancedApi } from '@/services/advancedApi';
import { Loader2, Zap, Box, Link, Wallet } from 'lucide-react';

export default function Web3Page() {
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await advancedApi.getWeb3Stats();
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Web3 & Metaverse</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Blockchain integration and NFT stats.</p>
            </div>

            {loading ? (
                <div className="flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <Box className="w-8 h-8 opacity-80" />
                            <h2 className="text-xl font-bold">NFT Collectibles</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="text-indigo-100 text-sm mb-1">Total Minted</div>
                                <div className="text-3xl font-bold">{data?.nft_collectibles.total_minted}</div>
                            </div>
                            <div>
                                <div className="text-indigo-100 text-sm mb-1">Owned by Users</div>
                                <div className="text-3xl font-bold">{data?.nft_collectibles.owned_by_users}</div>
                            </div>
                            <div>
                                <div className="text-indigo-100 text-sm mb-1">Floor Price</div>
                                <div className="text-3xl font-bold">${data?.nft_collectibles.floor_price_usd}</div>
                            </div>
                            <div>
                                <div className="text-indigo-100 text-sm mb-1">Top Collection</div>
                                <div className="text-lg font-bold truncate">{data?.nft_collectibles.top_collection}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <Wallet className="w-6 h-6 text-zinc-400" />
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Wallet Connect</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <span>Total Connected Wallets</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{data?.wallet_connect.total_connected}</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>MetaMask</span>
                                    <span>{data?.wallet_connect.metamask_share}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500" style={{ width: `${data?.wallet_connect.metamask_share}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Phantom</span>
                                    <span>{data?.wallet_connect.phantom_share}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${data?.wallet_connect.phantom_share}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Blockchain Verification</h2>
                        <div className="flex flex-wrap gap-4">
                            {data?.blockchain_verification.chains.map((chain: string) => (
                                <span key={chain} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-300 text-sm font-medium">
                                    {chain}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
