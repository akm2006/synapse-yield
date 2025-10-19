"use client";

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Listbox, Transition, Switch } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns';
import { formatUnits } from 'viem';
import { useState, useMemo, useEffect, Fragment, useCallback } from "react";
import {
  ArrowRight, TrendingUp, TrendingDown, RefreshCw,
  ExternalLink, ChevronLeft, ChevronRight, CircleSlash,
  BarChart2, ChevronDown, Check, Clock, List , XCircle, Bot, User
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { IActivity as DbActivityType } from '@/models/Activity';
import Image from 'next/image';

// --- Types ---
interface GraphActivity {
  id: string;
  activityType: "Stake" | "Unstake" | "Swap" | string;
  protocol: string;
  user: string;
  amount?: string;
  fromTokenName?: string;
  toTokenName?: string;
  fromAmount?: string;
  toAmount?: string;
  transactionHash: string;
  blockTimestamp: string;
}

interface UnifiedActivity {
  id: string;
  activityType: string;
  protocol: string | null;
  user: string;
  details?: string;
  amount?: string;
  fromTokenName?: string;
  toTokenName?: string;
  fromAmount?: string;
  toAmount?: string;
  transactionHash: string | null;
  timestamp: number;
  isAutomated: boolean;
  isNew?: boolean;
}


interface GetRecentActivityData {
  Activity: GraphActivity[];
}

// --- Logo Mapping ---
const logoMap: { [key: string]: string } = {
  MAGMA: '/magma.png',
  gMON: '/gmon.png',
  KINTSU: '/kintsu.png',
  sMON: '/smon.jpg',
  Pancake: '/pancake.png',
  MON: '/mon.jpeg',
  Synapse: '/logo.png',
};


// --- GraphQL Query ---
const GET_RECENT_ACTIVITY = gql`
  query GetRecentActivity {
    Activity(limit: 1000, order_by: { blockTimestamp: desc }) {
      id
      activityType
      protocol
      user
      amount
      fromTokenName
      toTokenName
      fromAmount
      toAmount
      transactionHash
      blockTimestamp
    }
  }
`;

// --- Helper & UI Components ---

const Logo = ({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const src = name ? logoMap[name] : undefined;
  const sizeClasses = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];

  if (!src) {
    return (
      <div className={`${sizeClasses} bg-gray-700 rounded-full flex items-center justify-center border border-gray-600`}>
        <BarChart2 className="w-1/2 h-1/2 text-gray-400" />
      </div>
    );
  }

  return (
   <Image
  src={src}
  alt={`${name} logo`}
  width={32} // Add appropriate width
  height={32} // Add appropriate height
  className="h-8 w-8 object-contain transition-all duration-300 group-hover:grayscale-0 grayscale"
/>
  );
};

const StatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm text-green-400">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live
    </div>
);

const Loader = () => (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
        <p>Loading Live Activity...</p>
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <CircleSlash className="w-8 h-8 mb-2" />
        <p>No activity found for the selected filters.</p>
    </div>
);

type CustomSelectOption = {
  value: string;
  label: string;
  icon?: React.ElementType;
  logoName?: string;
};

const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (value: string) => void, options: CustomSelectOption[], placeholder: string }) => {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-default rounded-md bg-gray-800 py-2 pl-3 pr-10 text-left border border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition">
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.logoName && <Logo name={selectedOption.logoName} size="sm" />}
            {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 text-gray-400" />}
            <span className="text-white">{selectedOption ? selectedOption.label : placeholder}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-800/80 backdrop-blur-sm py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-900/50 text-white' : 'text-gray-300'}`}
                value={option.value}
              >
                {({ selected }) => (
                  <>
                    <span className={`flex items-center gap-2 truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.logoName && <Logo name={option.logoName} size="sm" />}
                      {option.icon && <option.icon className="w-4 h-4 text-gray-400" />}
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-400">
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};


// --- Main Activity Item Component ---
function ActivityItem({ activity }: { activity: UnifiedActivity }) {
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const userShort = `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}`;

  const format = (val?: string, decimals = 18) => val ? parseFloat(formatUnits(BigInt(val), decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0';

  const protocolToTokenMap: { [key: string]: string } = {
    MAGMA: 'gMON',
    KINTSU: 'sMON'
  };

  const renderDetails = () => {
    if (activity.isAutomated && activity.details) {
      return <div className="text-gray-300">{activity.details}</div>;
    }

    switch (activity.activityType) {
      case "Stake":
      case "Unstake":
        const tokenName = activity.protocol ? protocolToTokenMap[activity.protocol] || activity.protocol : '?';
        return (
            <div className="flex items-center gap-2">
                <Logo name={tokenName} size="md" />
                <strong className="font-medium text-xl text-white">{format(activity.amount)}</strong>
                <span className="text-gray-400">{tokenName}</span>
            </div>
        );
      case "Swap":
        return (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
                <Logo name={activity.fromTokenName} size="md" />
                <strong className="font-medium text-lg text-white">{format(activity.fromAmount)} {activity.fromTokenName}</strong>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div className="flex items-center gap-2">
                <Logo name={activity.toTokenName} size="md" />
                <strong className="font-medium text-lg text-white">{format(activity.toAmount)} {activity.toTokenName}</strong>
            </div>
          </div>
        );
      default:
        return <span className="text-gray-400">An unknown action was performed.</span>;
    }
  };

  const actionText = {
      Stake: { verb: 'staked', icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
      Unstake: { verb: 'unstaked', icon: <TrendingDown className="w-4 h-4 text-red-400" /> },
      Swap: { verb: 'swapped', icon: <RefreshCw className="w-4 h-4 text-blue-400" /> },
      Rebalance: { verb: 'rebalanced', icon: <Bot className="w-4 h-4 text-purple-400" /> },
  }[activity.activityType] || { verb: 'performed an action', icon: <BarChart2 className="w-4 h-4 text-gray-400" /> };

  return (
    <li className={`flex items-start space-x-4 p-4 transition-all duration-300 rounded-lg border-b border-gray-800 last:border-none ${activity.isNew ? 'highlight-new' : 'hover:bg-gray-800/50'}`}>
      <Logo name={activity.isAutomated ? 'Synapse' : activity.protocol || undefined} size="lg" />
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                 <div className="flex items-center gap-2 text-sm flex-wrap">
                    {actionText.icon}
                    <a href={`https://testnet.monadexplorer.com/address/${activity.user}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-400 hover:underline">{userShort}</a>
                    <span className="text-gray-400">{actionText.verb}</span>
                    {activity.protocol && (
                         <>
                            <span className="text-gray-400">on</span>
                            <strong className="font-medium text-white">{activity.protocol}</strong>
                         </>
                    )}
                    {activity.isAutomated && (
                        <span className="ml-2 inline-flex items-center gap-1.5 bg-purple-900/50 text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-700/50">
                            <Bot className="w-3 h-3"/> Automated
                        </span>
                    )}
                </div>
                <div className="mt-2">{renderDetails()}</div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
                 <p className="text-xs text-gray-500">{timeAgo}</p>
                 {activity.transactionHash && (
                    <a href={`https://testnet.monadexplorer.com/tx/${activity.transactionHash}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-gray-500 hover:text-blue-400 transition-colors" aria-label="View Transaction">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                 )}
            </div>
        </div>
      </div>
    </li>
  );
}

// --- Main Feed Component ---
export function ActivityFeed() {
  const { isAuthenticated, user: authUser } = useAuth();
  const { smartAccountAddress } = useSmartAccount();

  const { loading: graphLoading, error: graphError, data: graphData, refetch: graphRefetch } = useQuery<GetRecentActivityData>(
    GET_RECENT_ACTIVITY, { pollInterval: 30000, notifyOnNetworkStatusChange: true }
  );

  const [dbActivities, setDbActivities] = useState<DbActivityType[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchDbActivities = useCallback(async () => {
    if (!isAuthenticated) return;

    setDbLoading(true);
    setDbError(null);
    try {
      const response = await fetch('/api/activity/db');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok) {
        setDbActivities(data.activities);
      } else {
        throw new Error(data.error || 'Failed to fetch DB activities');
      }
    } catch (error: any) {
      console.error("Failed to fetch DB activities:", error);
      setDbError(error.message || 'Could not load automated activities.');
    } finally {
      setDbLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDbActivities();
    const interval = setInterval(fetchDbActivities, 45000);
    return () => clearInterval(interval);
  }, [fetchDbActivities]);

  const loading = (graphLoading && !graphData) || (dbLoading && dbActivities.length === 0);
  const combinedError = graphError || dbError;

  const [page, setPage] = useState(0);
  const [filterActivity, setFilterActivity] = useState<string>("");
  const [filterProtocol, setFilterProtocol] = useState<string>("");
  const [sortBy, setSortBy] = useState<"Newest" | "Oldest" | "Amount">("Newest");
  const [showMySmartAccountOnly, setShowMySmartAccountOnly] = useState(false);
  
  const [previousActivityIds, setPreviousActivityIds] = useState<Set<string>>(new Set());
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 15;

  const allActivities = useMemo(() => {
    const combined: UnifiedActivity[] = [];

    if (graphData?.Activity) {
      graphData.Activity.forEach(act => {
        combined.push({
          ...act,
          id: `graph-${act.id}`,
          timestamp: Number(act.blockTimestamp) * 1000,
          isAutomated: false,
          transactionHash: act.transactionHash,
        });
      });
    }

    dbActivities.forEach(act => {
      combined.push({
        id: `db-${act._id}`,
        activityType: act.transactionType,
        protocol: 'Synapse',
        user: act.userAddress,
        details: act.details,
        transactionHash: act.txHash || null,
        timestamp: new Date(act.timestamp).getTime(),
        isAutomated: true,
      });
    });

    const uniqueActivities = Array.from(new Map(combined.map(item => [item.transactionHash || item.id, item])).values());
    return uniqueActivities;
  }, [graphData, dbActivities]);

  useEffect(() => {
    if (allActivities.length > 0) {
      const currentIds = new Set(allActivities.map(a => a.id));
      setPreviousActivityIds(prevIds => {
        if (prevIds.size > 0) {
          const newIds = new Set([...currentIds].filter(id => !prevIds.has(id)));
          setNewActivityIds(newIds);
          if (newIds.size > 0) {
              setTimeout(() => setNewActivityIds(new Set()), 3000);
          }
        }
        return currentIds;
      });
    }
  }, [allActivities]);


  const { allProtocols, allActivityTypes } = useMemo(() => {
    const defaultTypes = ["Stake", "Unstake", "Swap", "Rebalance"];
    const defaultProtocols = ["MAGMA", "KINTSU", "Pancake", "Synapse"];

    const protocolsFromData = Array.from(new Set(allActivities.map(a => a.protocol).filter(Boolean))) as string[];
    const typesFromData = Array.from(new Set(allActivities.map(a => a.activityType)));
    
    return {
      allProtocols: Array.from(new Set([...defaultProtocols, ...protocolsFromData])).sort(),
      allActivityTypes: Array.from(new Set([...defaultTypes, ...typesFromData])).sort()
    };
  }, [allActivities]);

  const filteredActivities = useMemo(() => {
    let items = allActivities
      .filter(a => filterActivity ? a.activityType === filterActivity : true)
      .filter(a => filterProtocol ? (a.protocol === filterProtocol || (filterProtocol === 'Synapse' && a.isAutomated)) : true);

    if (showMySmartAccountOnly && smartAccountAddress && authUser) {
        const currentUserEOA = authUser.address.toLowerCase();
        const currentSA = smartAccountAddress.toLowerCase();

        items = items.filter(activity => {
            const activityUser = activity.user.toLowerCase();
            // Graph data 'user' is the smart account.
            // DB 'user' is the owner's EOA.
            return activityUser === currentSA || activityUser === currentUserEOA;
        });
    }

    return items.sort((a, b) => {
      switch (sortBy) {
        case "Oldest": return a.timestamp - b.timestamp;
        case "Amount":
          const getAmount = (act: UnifiedActivity) => BigInt(act.amount ?? act.fromAmount ?? '0');
          const amountA = getAmount(a);
          const amountB = getAmount(b);
          return amountB > amountA ? 1 : amountA > amountB ? -1 : 0;
        default:
             return b.timestamp - a.timestamp;
      }
    });
  }, [allActivities, filterActivity, filterProtocol, sortBy, showMySmartAccountOnly, smartAccountAddress, authUser]);
  
  const pageItems = filteredActivities.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  const activityTypeIcons: { [key: string]: React.ElementType } = {
    Stake: TrendingUp,
    Unstake: TrendingDown,
    Swap: RefreshCw,
    Rebalance: Bot,
  };

  const sortOptions = [
      { value: 'Newest', label: 'Sort: Newest', icon: Clock },
      { value: 'Oldest', label: 'Sort: Oldest', icon: Clock },
      { value: 'Amount', label: 'Sort: Amount', icon: BarChart2 },
  ];

  const activityOptions = allActivityTypes.map(type => ({
      value: type,
      label: type,
      icon: activityTypeIcons[type] || BarChart2
  }));

  const protocolOptions = allProtocols.map(proto => ({
      value: proto,
      label: proto,
      logoName: proto,
  }));
  
  const handleRefetch = () => {
      graphRefetch();
      fetchDbActivities();
  }
  
  const renderContent = () => {
    if (loading) return <Loader />;
    if (combinedError) return (
      <div className="text-center py-10 flex flex-col items-center">
        <XCircle className="w-8 h-8 mb-2 text-red-400" />
        <p className="text-red-400">Error fetching activity:</p>
        {graphError && <p className="text-red-400 text-sm mt-1">Indexer: {graphError.message}</p>}
        {dbError && <p className="text-red-400 text-sm mt-1">Database: {dbError}</p>}
      </div>
    );
    if (pageItems.length === 0) return <EmptyState />;

    return (
      <>
        <ul>{pageItems.map(act => <ActivityItem key={act.id} activity={{...act, isNew: newActivityIds.has(act.id)}} />)}</ul>
        <div className="flex justify-between items-center mt-6 text-sm">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /> Previous</button>
          <span className="text-gray-400">Page {page + 1} of {totalPages > 0 ? totalPages : 1}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || totalPages === 0} className="flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed transition">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      </>
    );
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl shadow-black/20">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Live Activity</h2>
            <StatusIndicator />
        </div>
        <button onClick={handleRefetch} disabled={graphLoading || dbLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-lg shadow-blue-500/10">
            <RefreshCw className={`w-4 h-4 ${(graphLoading || dbLoading) ? 'animate-spin' : ''}`} />
            {(graphLoading || dbLoading) ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-black/20 border border-gray-800 rounded-lg">
          <CustomSelect value={filterActivity} onChange={(val) => {setFilterActivity(val); setPage(0);}} options={[{ value: '', label: 'All Activity Types', icon: List }, ...activityOptions]} placeholder="All Activity Types" />
          <CustomSelect value={filterProtocol} onChange={(val) => {setFilterProtocol(val); setPage(0);}} options={[{ value: '', label: 'All Protocols', icon: List }, ...protocolOptions]} placeholder="All Protocols" />
          <CustomSelect value={sortBy} onChange={(val) => setSortBy(val as any)} options={sortOptions} placeholder="Sort by..." />
      </div>

       <div className="flex items-center justify-end mb-4 px-1">
          <Switch.Group as="div" className="flex items-center">
            <Switch
              checked={showMySmartAccountOnly}
              onChange={(checked) => {setShowMySmartAccountOnly(checked); setPage(0);}}
              disabled={!smartAccountAddress || !isAuthenticated}
              className={`${
                showMySmartAccountOnly ? 'bg-blue-600' : 'bg-gray-700'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`${
                  showMySmartAccountOnly ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3 text-sm">
              <span className={`font-medium ${!smartAccountAddress ? 'text-gray-500' : 'text-gray-300'}`}>Show My Account&apos;s Transactions</span>
            </Switch.Label>
          </Switch.Group>
        </div>

      {renderContent()}
    </div>
  );
}

