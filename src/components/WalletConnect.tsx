import { useState } from "react";
import {
  ARC_TESTNET,
  areContractsDeployed,
  connectWallet,
  deployedContracts,
  explorerAddressUrl,
  switchToArcTestnet,
  type WalletState,
} from "../lib/arc";

function truncateAddress(address: string): string {
  return address.slice(0, 10) + "..." + address.slice(-6);
}

export default function WalletConnect({ compact = false }: { compact?: boolean }) {
  const [wallet, setWallet] = useState<WalletState>({ address: null, chainId: null, connected: false });
  const [busy, setBusy] = useState(false);
  const [switchBusy, setSwitchBusy] = useState(false);
  const contractsLive = areContractsDeployed();
  const deployedCount = deployedContracts().length;

  const onConnect = async () => {
    setBusy(true);
    const w = await connectWallet();
    setWallet(w);
    if (w.connected && w.chainId !== ARC_TESTNET.chainId) {
      const sw = await switchToArcTestnet();
      if (!sw.ok) setWallet({ ...w, error: sw.error });
      else setWallet({ ...w, chainId: ARC_TESTNET.chainId });
    }
    setBusy(false);
  };

  const onSwitch = async () => {
    setSwitchBusy(true);
    const sw = await switchToArcTestnet();
    if (sw.ok) setWallet({ ...wallet, chainId: ARC_TESTNET.chainId, error: undefined });
    else setWallet({ ...wallet, error: sw.error });
    setSwitchBusy(false);
  };

  const onDisconnect = () => {
    setWallet({ address: null, chainId: null, connected: false });
  };

  const onWrongNetwork = wallet.connected && wallet.chainId !== ARC_TESTNET.chainId;
  const box = compact
    ? "rounded-xl bg-white/5 p-3 text-xs"
    : "rounded-xl border border-slate-200 bg-white p-4 text-sm";
  const muted = compact ? "text-slate-400" : "text-slate-500";
  const strong = compact ? "text-emerald-400" : "text-emerald-600";

  return (
    <div className={box}>
      <p className={`font-semibold ${compact ? "text-slate-100" : "text-slate-900"}`}>
        Arc Testnet wallet
      </p>
      <dl className={`mt-2 space-y-1 ${muted}`}>
        <div className="flex justify-between gap-2">
          <dt>Network</dt>
          <dd className="font-medium text-right">Arc Testnet, chain {ARC_TESTNET.chainId}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>RPC</dt>
          <dd className="break-all text-right">{ARC_TESTNET.rpc}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Explorer</dt>
          <dd className="break-all text-right">
            <a href={ARC_TESTNET.explorer} target="_blank" rel="noreferrer" className="underline">
              {ARC_TESTNET.explorer}
            </a>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Gas token</dt>
          <dd className="font-medium text-right">USDC, 18 decimals (native)</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Contracts</dt>
          <dd className="font-medium text-right">
            {contractsLive ? "Deployed, live mode" : "Not deployed, " + deployedCount + " of 8 configured, simulated mode"}
          </dd>
        </div>
      </dl>

      {wallet.connected && wallet.address ? (
        <div className="mt-3">
          <p className={`font-semibold ${strong}`}>Wallet connected</p>
          <p className="mt-1">
            <a
              href={explorerAddressUrl(wallet.address)}
              target="_blank"
              rel="noreferrer"
              className="break-all underline"
            >
              {truncateAddress(wallet.address)}
            </a>
          </p>
          <p className={`mt-1 ${muted}`}>
            {onWrongNetwork
              ? "Wrong network: chain " + wallet.chainId + ". Switch to Arc Testnet to use on chain actions."
              : "On Arc Testnet (5042002)."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {onWrongNetwork ? (
              <button
                onClick={onSwitch}
                disabled={switchBusy}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {switchBusy ? "Switching..." : "Switch to Arc Testnet"}
              </button>
            ) : null}
            <button
              onClick={onDisconnect}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            onClick={onConnect}
            disabled={busy}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {busy ? "Connecting..." : "Connect wallet"}
          </button>
          <p className={`mt-2 ${muted}`}>
            Connect a MetaMask compatible wallet. Testnet only, chain 5042002.
          </p>
        </div>
      )}

      {wallet.error ? <p className="mt-2 text-red-500">{wallet.error}</p> : null}

      <p className={`mt-3 border-t pt-2 ${muted}`}>
        Citizens do not need a wallet. All public records, budgets, payments, and audit reports are
        readable without connecting. A wallet is only needed for officials who sign on chain actions.
      </p>
    </div>
  );
}
