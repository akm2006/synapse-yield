"use client";

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Listbox, Transition } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns';
import { formatUnits } from 'viem';
import { useState, useMemo, useEffect, Fragment } from "react";
import { 
  ArrowRight, TrendingUp, TrendingDown, RefreshCw, 
  ExternalLink, ChevronLeft, ChevronRight, CircleSlash, 
  BarChart2, ChevronDown, Check, Clock, List , XCircle
} from 'lucide-react';

// --- Types ---
interface Activity {
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

interface GetRecentActivityData {
  Activity: Activity[];
}

// --- Logo Mapping ---
const logoMap: { [key: string]: string } = {
  MAGMA: 'https://pbs.twimg.com/profile_images/1798840544887787520/OWxSEpYX_400x400.jpg',
  gMON: 'https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/82b24e7a1ed5ff824419f794d18655bee9098a9f5430ae4c894593528dc7ca24.png',
  KINTSU: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTj3F7vXwHFIlqYcntoM6enbZgnVXg0tUArIA&s',
  sMON: 'https://pbs.twimg.com/profile_images/1884373636649209857/x6Fynec3_400x400.jpg',
  Pancake: 'https://s2.coinmarketcap.com/static/img/coins/200x200/7186.png',
  MON: 'https://pbs.twimg.com/profile_images/1792640194954964992/GLb33sYF_400x400.jpg',
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
    <img
      src={src}
      alt={`${name || 'token'} logo`}
      className={`${sizeClasses} rounded-full bg-gray-800 border border-gray-700/50 shadow-md`}
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

// --- Custom Select Component ---
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
function ActivityItem({ activity, isNew }: { activity: Activity; isNew: boolean }) {
  const timeAgo = formatDistanceToNow(new Date(Number(activity.blockTimestamp) * 1000), { addSuffix: true });
  const userShort = `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}`;
  
  const format = (val?: string, decimals = 18) => val ? parseFloat(formatUnits(BigInt(val), decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0';
  
  const protocolToTokenMap: { [key: string]: string } = {
    MAGMA: 'gMON',
    KINTSU: 'sMON'
  };

  const renderAmountDetails = () => {
    switch (activity.activityType) {
      case "Stake":
      case "Unstake":
        const tokenName = protocolToTokenMap[activity.protocol] || activity.protocol;
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
      Swap: { verb: 'swapped', icon: <RefreshCw className="w-4 h-4 text-blue-400" /> }
  }[activity.activityType] || { verb: 'performed an action', icon: <BarChart2 className="w-4 h-4 text-gray-400" /> };

  return (
    <li className={`flex items-start space-x-4 p-4 transition-all duration-300 rounded-lg border-b border-gray-800 last:border-none ${isNew ? 'highlight-new' : 'hover:bg-gray-800/50'}`}>
      <Logo name={activity.protocol} size="lg" />
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 text-sm">
                    {actionText.icon}
                    <a href={`https://testnet.monadexplorer.com/address/${activity.user}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-400 hover:underline">{userShort}</a>
                    <span className="text-gray-400">{actionText.verb} on</span>
                    <strong className="font-medium text-white">{activity.protocol}</strong>
                </div>
                <div className="mt-2">{renderAmountDetails()}</div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
                 <p className="text-xs text-gray-500">{timeAgo}</p>
                 <a href={`https://testnet.monadexplorer.com/tx/${activity.transactionHash}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-gray-500 hover:text-blue-400 transition-colors" aria-label="View Transaction">
                    <ExternalLink className="w-4 h-4" />
                 </a>
            </div>
        </div>
      </div>
    </li>
  );
}

// --- Main Feed Component ---
export function ActivityFeed() {
  const { loading, error, data, refetch } = useQuery<GetRecentActivityData>(
    GET_RECENT_ACTIVITY, { pollInterval: 30000, notifyOnNetworkStatusChange: true }
  );

  const [page, setPage] = useState(0);
  const [filterActivity, setFilterActivity] = useState<string>("");
  const [filterProtocol, setFilterProtocol] = useState<string>("");
  const [sortBy, setSortBy] = useState<"Newest" | "Oldest" | "Amount">("Newest");
  
  const [previousActivityIds, setPreviousActivityIds] = useState<Set<string>>(new Set());
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 15;

  useEffect(() => {
    if (data?.Activity) {
      const currentIds = new Set(data.Activity.map(a => a.id));
      setPreviousActivityIds(prevIds => {
        if (prevIds.size > 0) {
          const newIds = new Set([...currentIds].filter(id => !prevIds.has(id)));
          setNewActivityIds(newIds);
        }
        return currentIds;
      });
    }
  }, [data]);

  const { allProtocols, allActivityTypes } = useMemo(() => {
    const defaultTypes = ["Stake", "Unstake", "Swap"];
    const defaultProtocols = ["MAGMA", "KINTSU", "Pancake"];

    if (!data?.Activity) {
      return { 
        allProtocols: defaultProtocols, 
        allActivityTypes: defaultTypes 
      };
    }
    
    const protocolsFromData = Array.from(new Set(data.Activity.map(a => a.protocol)));
    const typesFromData = Array.from(new Set(data.Activity.map(a => a.activityType)));
    
    return { 
      allProtocols: Array.from(new Set([...defaultProtocols, ...protocolsFromData])).sort(),
      allActivityTypes: Array.from(new Set([...defaultTypes, ...typesFromData])).sort()
    };
  }, [data]);

  const filteredActivities = useMemo(() => {
    if (!data?.Activity) return [];
    let items = [...data.Activity]
      .filter(a => filterActivity ? a.activityType === filterActivity : true)
      .filter(a => filterProtocol ? a.protocol === filterProtocol : true);

    return items.sort((a, b) => {
      switch (sortBy) {
        case "Oldest": return Number(a.blockTimestamp) - Number(b.blockTimestamp);
        case "Amount":
          const getAmount = (act: Activity) => BigInt(act.amount ?? act.fromAmount ?? '0');
          const amountA = getAmount(a);
          const amountB = getAmount(b);
          return amountB > amountA ? 1 : amountA > amountB ? -1 : 0;
        default: return Number(b.blockTimestamp) - Number(a.blockTimestamp);
      }
    });
  }, [data, filterActivity, filterProtocol, sortBy]);
  
  const pageItems = filteredActivities.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  const activityTypeIcons: { [key: string]: React.ElementType } = {
    Stake: TrendingUp,
    Unstake: TrendingDown,
    Swap: RefreshCw,
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
  
  const renderContent = () => {
    if (loading && !data) return <Loader />;
    if (error) return <div className="text-center text-red-400 py-10 flex flex-col items-center"><XCircle className="w-8 h-8 mb-2" /><p>Error fetching activity: {error.message}</p></div>;
    if (pageItems.length === 0) return <EmptyState />;

    return (
      <>
        <ul>{pageItems.map(act => <ActivityItem key={act.id} activity={act} isNew={newActivityIds.has(act.id)} />)}</ul>
        <div className="flex justify-between items-center mt-6 text-sm">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /> Previous</button>
          <span className="text-gray-400">Page {page + 1} of {totalPages > 0 ? totalPages : 1}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed transition">Next <ChevronRight className="w-4 h-4" /></button>
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
        <button onClick={() => refetch()} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-lg shadow-blue-500/10"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-black/20 border border-gray-800 rounded-lg">
          <CustomSelect value={filterActivity} onChange={(val) => {setFilterActivity(val); setPage(0);}} options={[{ value: '', label: 'All Activity Types', icon: List }, ...activityOptions]} placeholder="All Activity Types" />
          <CustomSelect value={filterProtocol} onChange={(val) => {setFilterProtocol(val); setPage(0);}} options={[{ value: '', label: 'All Protocols', icon: List }, ...protocolOptions]} placeholder="All Protocols" />
          <CustomSelect value={sortBy} onChange={(val) => setSortBy(val as any)} options={sortOptions} placeholder="Sort by..." />
      </div>
      {renderContent()}
    </div>
  );
}

