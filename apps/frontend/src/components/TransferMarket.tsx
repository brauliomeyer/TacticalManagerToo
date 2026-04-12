import React, { useState } from "react";

// --- Mock Data Models ---
type Player = {
	id: string;
	name: string;
	age: number;
	position: string;
	club: string;
	rating: number;
	potential: number;
	value: number;
	wage: number;
	contractYears: number;
	morale?: number;
	status?: string;
};
type TransferOffer = {
	id: string;
	playerId: string;
	fromClub: string;
	toClub: string;
	amount: number;
	type: "buy" | "loan";
	status: "pending" | "accepted" | "rejected" | "counter";
};
type YouthPlayer = {
	id: string;
	name: string;
	age: number;
	position: string;
	potential: number;
	development: number;
};

type TabKey =
	| "overview"
	| "squad"
	| "transfer-list"
	| "scout"
	| "shortlist"
	| "offers"
	| "youth";

const TABS: { key: TabKey; label: string }[] = [
	{ key: "overview", label: "Overview" },
	{ key: "squad", label: "Squad" },
	{ key: "transfer-list", label: "Transfer List" },
	{ key: "scout", label: "Scout/Search" },
	{ key: "shortlist", label: "Shortlist" },
	{ key: "offers", label: "Offers" },
	{ key: "youth", label: "Youth Academy" },
];

// --- Mock Data (voor nu, later API) ---
const mockPlayers: Player[] = [
	{
		id: "1",
		name: "John Smith",
		age: 25,
		position: "CM",
		club: "My FC",
		rating: 74,
		potential: 80,
		value: 8500000,
		wage: 42000,
		contractYears: 2,
		morale: 80,
		status: "Happy",
	},
	{
		id: "2",
		name: "Alex Johnson",
		age: 28,
		position: "CB",
		club: "My FC",
		rating: 70,
		potential: 72,
		value: 4000000,
		wage: 35000,
		contractYears: 1,
		morale: 60,
		status: "Unsettled",
	},
];

const mockOffers: TransferOffer[] = [
	{
		id: "o1",
		playerId: "1",
		fromClub: "Other FC",
		toClub: "My FC",
		amount: 9000000,
		type: "buy",
		status: "pending",
	},
];

// --- BudgetPanel ---
function BudgetPanel({
	transferBudget,
	wageBudget,
	wageSpend,
	windowOpen,
	windowDays,
	squadSize,
	incoming,
	outgoing,
}: {
	transferBudget: number;
	wageBudget: number;
	wageSpend: number;
	windowOpen: boolean;
	windowDays: number;
	squadSize: number;
	incoming: number;
	outgoing: number;
}) {
	return (
		<div className="border-2 border-[#efe56b] bg-[#1a3a1e] px-3 py-2 mb-3 sticky top-0 z-10">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
				<span className="text-[#98ca7a]">
					Transfer Budget: <strong className="text-white">£{(transferBudget / 1_000_000).toFixed(1)}M</strong>
				</span>
				<span className="text-[#98ca7a]">
					Wage Budget: <strong className="text-white">£{(wageBudget / 1000).toFixed(0)}K/w</strong>
				</span>
				<span className="text-[#98ca7a]">
					Wage Spend: <strong className="text-white">£{(wageSpend / 1000).toFixed(0)}K/w</strong>
				</span>
				<span className="text-[#98ca7a]">
					Remaining: <strong className={transferBudget > 0 ? "text-[#2a8a2b]" : "text-[#ff4444]"}>£{(transferBudget / 1_000_000).toFixed(1)}M</strong>
				</span>
				<span className="text-[#6b9a5a]">|</span>
				<span className={`border px-1.5 py-0.5 text-[10px] font-bold ${windowOpen ? "border-[#2a8a2b] bg-[#0d3f10] text-[#2a8a2b]" : "border-[#8a2a2a] bg-[#3f100d] text-[#ff4444]"}`}>
					Window: {windowOpen ? "OPEN" : "CLOSED"}
				</span>
				{windowOpen && (
					<span className="text-[10px] text-[#efe56b]">{windowDays} days left</span>
				)}
				<span className="text-[#6b9a5a]">|</span>
				<span className="text-[10px] text-[#d5f8b6]">
					Squad: <strong className="text-white">{squadSize}</strong>
				</span>
				<span className="text-[10px] text-[#d5f8b6]">
					Incoming: <strong className="text-[#efe56b]">{incoming}</strong>
				</span>
				<span className="text-[10px] text-[#d5f8b6]">
					Outgoing: <strong className="text-[#00e5ff]">{outgoing}</strong>
				</span>
			</div>
		</div>
	);
}

// --- Tab Navigation ---
function TransferTabs({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
	return (
		<div className="flex gap-2 mb-4">
			{TABS.map((t) => (
				<button
					key={t.key}
					onClick={() => setTab(t.key)}
					className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide border-b-2 transition-colors ${
						tab === t.key
							? "border-[#efe56b] text-[#efe56b] bg-[#222]"
							: "border-transparent text-[#00e5ff] hover:text-[#efe56b]"
					}`}
					style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

// --- Loading, Error, Empty States ---
function LoadingState() {
	return <div className="text-center py-8 text-[#efe56b]">Loading transfer data…</div>;
}
function ErrorState({ msg }: { msg: string }) {
	return <div className="text-center py-8 text-[#ff4444]">{msg}</div>;
}
function EmptyState({ msg }: { msg: string }) {
	return <div className="text-center py-8 text-[#00e5ff]">{msg}</div>;
}

// --- Main TransferPage Component ---
const TransferMarket: React.FC = () => {
	// Mock state (vervang later door API calls)
	const [tab, setTab] = useState<TabKey>("overview");
	const [loading] = useState(false);
	const [error] = useState<string | null>(null);

	// Budget en window mock
	const transferBudget = 12500000;
	const wageBudget = 450000;
	const wageSpend = mockPlayers.reduce((sum, p) => sum + p.wage, 0);
	const windowOpen = true;
	const windowDays = 14;
	const squadSize = mockPlayers.length;
	const incoming = mockOffers.filter((o) => o.toClub === "My FC").length;
	const outgoing = mockOffers.filter((o) => o.fromClub === "My FC").length;

	// --- Render ---
	return (
		<div className="bg-[#181818] min-h-screen p-4" style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}>
			<BudgetPanel
				transferBudget={transferBudget}
				wageBudget={wageBudget}
				wageSpend={wageSpend}
				windowOpen={windowOpen}
				windowDays={windowDays}
				squadSize={squadSize}
				incoming={incoming}
				outgoing={outgoing}
			/>
			<TransferTabs tab={tab} setTab={setTab} />

			{loading ? (
				<LoadingState />
			) : error ? (
				<ErrorState msg={error} />
			) : (
				<div className="border border-[#efe56b] bg-[#232323] p-4 rounded min-h-[300px]">
					{/* Per tab de juiste submodule tonen, later uitwerken */}
					{tab === "overview" && <EmptyState msg="Overview tab (wordt uitgewerkt)" />}
					{tab === "squad" && <EmptyState msg="Squad tab (wordt uitgewerkt)" />}
					{tab === "transfer-list" && <EmptyState msg="Transfer List tab (wordt uitgewerkt)" />}
					{tab === "scout" && <EmptyState msg="Scout/Search tab (wordt uitgewerkt)" />}
					{tab === "shortlist" && <EmptyState msg="Shortlist tab (wordt uitgewerkt)" />}
					{tab === "offers" && <EmptyState msg="Offers tab (wordt uitgewerkt)" />}
					{tab === "youth" && <EmptyState msg="Youth Academy tab (wordt uitgewerkt)" />}
				</div>
			)}
		</div>
	);
};

export default TransferMarket;
