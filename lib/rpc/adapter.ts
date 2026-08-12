import type {
  AssetIssuance,
  AssetOwnership,
  AssetPossession,
  GetEventLogsRequest,
  GetTransactionsForIdentityRequest,
  Hits,
  Ipo,
  IssuedAsset,
  LiveTickInfo,
  OwnedAsset,
  PossessedAsset,
  ProcessedTickInterval,
  QueryComputorList,
  QueryEvent,
  QuerySmartContractRequest,
  QuerySmartContractResponse,
  QueryTickData,
  QueryTransaction,
  QubicBalance,
} from "@qubic.org/rpc";

import type { ExplorerRpcClients } from "./clients";
import { explorerRpc } from "./clients";
import { executeRpcRequest, type RpcRequestOptions } from "./request";
import {
  assertValidEpoch,
  assertValidIdentity,
  assertValidTick,
  assertValidTransactionHash,
  type QubicTick,
} from "./validation";

export type ExplorerTransactionsForIdentityRequest = Omit<
  GetTransactionsForIdentityRequest,
  "identity"
> & { identity: string };

export interface ExplorerRpcAdapter {
  getTickInfo(options?: RpcRequestOptions): Promise<LiveTickInfo>;
  getBalance(identity: string, options?: RpcRequestOptions): Promise<QubicBalance>;
  getIssuedAssets(identity: string, options?: RpcRequestOptions): Promise<IssuedAsset[]>;
  getOwnedAssets(identity: string, options?: RpcRequestOptions): Promise<OwnedAsset[]>;
  getPossessedAssets(identity: string, options?: RpcRequestOptions): Promise<PossessedAsset[]>;
  getAssetIssuances(
    filter?: { issuerIdentity?: string; assetName?: string },
    options?: RpcRequestOptions,
  ): Promise<AssetIssuance[]>;
  getAssetOwnerships(
    filter?: {
      issuerIdentity?: string;
      assetName?: string;
      ownerIdentity?: string;
      ownershipManagingContract?: number;
    },
    options?: RpcRequestOptions,
  ): Promise<AssetOwnership[]>;
  getAssetPossessions(
    filter?: {
      issuerIdentity?: string;
      assetName?: string;
      ownerIdentity?: string;
      possessorIdentity?: string;
      ownershipManagingContract?: number;
      possessionManagingContract?: number;
    },
    options?: RpcRequestOptions,
  ): Promise<AssetPossession[]>;
  getActiveIpos(options?: RpcRequestOptions): Promise<Ipo[]>;
  getLastProcessedTick(options?: RpcRequestOptions): Promise<{
    tickNumber: number;
    epoch: number;
    intervalInitialTick: number;
    logTickNumber: number;
  }>;
  getProcessedTickIntervals(options?: RpcRequestOptions): Promise<ProcessedTickInterval[]>;
  getComputorListsForEpoch(epoch: number, options?: RpcRequestOptions): Promise<QueryComputorList[]>;
  getTickData(tick: number | QubicTick, options?: RpcRequestOptions): Promise<QueryTickData>;
  getTransactionByHash(hash: string, options?: RpcRequestOptions): Promise<QueryTransaction>;
  getTransactionsForIdentity(
    request: ExplorerTransactionsForIdentityRequest,
    options?: RpcRequestOptions,
  ): Promise<{
    transactions: QueryTransaction[];
    hits: Hits;
    validForTick: number;
  }>;
  getTransactionsForTick(tick: number | QubicTick, options?: RpcRequestOptions): Promise<QueryTransaction[]>;
  getEventLogs(
    request: GetEventLogsRequest,
    options?: RpcRequestOptions,
  ): Promise<{
    eventLogs: QueryEvent[];
    hits: Hits;
    validForTick: number;
  }>;
  querySmartContract(
    request: QuerySmartContractRequest,
    options?: RpcRequestOptions,
  ): Promise<QuerySmartContractResponse>;
}

export function createExplorerRpcAdapter(
  clients: ExplorerRpcClients = explorerRpc,
): ExplorerRpcAdapter {
  return {
    getTickInfo: (options) =>
      executeRpcRequest(
        (signal) => clients.live.getTickInfo({ signal }),
        { endpoint: "/live/v1/tick-info", ...options },
      ),

    getBalance: (identity, options) => {
      const validIdentity = assertValidIdentity(identity);
      return executeRpcRequest(
        (signal) => clients.live.getBalance(validIdentity, { signal }),
        { endpoint: "/live/v1/balances/{id}", ...options },
      );
    },

    getIssuedAssets: (identity, options) => {
      const validIdentity = assertValidIdentity(identity);
      return executeRpcRequest(
        (signal) => clients.live.getIssuedAssets(validIdentity, { signal }),
        { endpoint: "/live/v1/assets/issued", ...options },
      );
    },

    getOwnedAssets: (identity, options) => {
      const validIdentity = assertValidIdentity(identity);
      return executeRpcRequest(
        (signal) => clients.live.getOwnedAssets(validIdentity, { signal }),
        { endpoint: "/live/v1/assets/owned", ...options },
      );
    },

    getPossessedAssets: (identity, options) => {
      const validIdentity = assertValidIdentity(identity);
      return executeRpcRequest(
        (signal) => clients.live.getPossessedAssets(validIdentity, { signal }),
        { endpoint: "/live/v1/assets/possessed", ...options },
      );
    },

    getAssetIssuances: (filter, options) =>
      executeRpcRequest(
        (signal) => clients.live.getAssetIssuances(filter, { signal }),
        { endpoint: "/live/v1/assets/issuances", ...options },
      ),

    getAssetOwnerships: (filter, options) =>
      executeRpcRequest(
        (signal) => clients.live.getAssetOwnerships(filter, { signal }),
        { endpoint: "/live/v1/assets/ownerships", ...options },
      ),

    getAssetPossessions: (filter, options) =>
      executeRpcRequest(
        (signal) => clients.live.getAssetPossessions(filter, { signal }),
        { endpoint: "/live/v1/assets/possessions", ...options },
      ),

    getActiveIpos: (options) =>
      executeRpcRequest(
        (signal) => clients.live.getActiveIpos({ signal }),
        { endpoint: "/live/v1/ipos/active", ...options },
      ),

    getLastProcessedTick: (options) =>
      executeRpcRequest(
        (signal) => clients.query.getLastProcessedTick({ signal }),
        { endpoint: "/query/v1/getLastProcessedTick", ...options },
      ),

    getProcessedTickIntervals: (options) =>
      executeRpcRequest(
        (signal) => clients.query.getProcessedTickIntervals({ signal }),
        { endpoint: "/query/v1/getProcessedTickIntervals", ...options },
      ),

    getComputorListsForEpoch: (epoch, options) => {
      const validEpoch = assertValidEpoch(epoch);
      return executeRpcRequest(
        (signal) => clients.query.getComputorListsForEpoch(validEpoch, { signal }),
        { endpoint: "/query/v1/getComputorListsForEpoch", ...options },
      );
    },

    getTickData: (tick, options) => {
      const validTick = assertValidTick(tick);
      return executeRpcRequest(
        (signal) => clients.query.getTickData(validTick, { signal }),
        { endpoint: "/query/v1/getTickData", ...options },
      );
    },

    getTransactionByHash: (hash, options) => {
      const validHash = assertValidTransactionHash(hash);
      return executeRpcRequest(
        (signal) => clients.query.getTransactionByHash(validHash, { signal }),
        { endpoint: "/query/v1/getTransactionByHash", ...options },
      );
    },

    getTransactionsForIdentity: (request, options) => {
      const validIdentity = assertValidIdentity(request.identity);
      return executeRpcRequest(
        (signal) => clients.query.getTransactionsForIdentity({ ...request, identity: validIdentity }, { signal }),
        { endpoint: "/query/v1/getTransactionsForIdentity", ...options },
      );
    },

    getTransactionsForTick: (tick, options) => {
      const validTick = assertValidTick(tick);
      return executeRpcRequest(
        (signal) => clients.query.getTransactionsForTick(validTick, { signal }),
        { endpoint: "/query/v1/getTransactionsForTick", ...options },
      );
    },

    getEventLogs: (request, options) =>
      executeRpcRequest(
        (signal) => clients.query.getEventLogs(request, { signal }),
        { endpoint: "/query/v1/getEventLogs", ...options },
      ),

    querySmartContract: (request, options) =>
      executeRpcRequest(
        (signal) => clients.live.querySmartContract(request, { signal }),
        { endpoint: "/live/v1/querySmartContract", ...options },
      ),
  };
}

export const explorerData = createExplorerRpcAdapter();
