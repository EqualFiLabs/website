import type { PositionNFT, Auction } from '@/types'

declare module '@/components/position/PositionNFTCard' {
  interface PositionNFTCardProps {
    nfts: PositionNFT[]
    loading: boolean
    error: string | null
    poolOptions: string[]
    poolMeta: Record<string, any>
    onSelectPosition: (id: string) => void
    selectedPositionId: string
    onMintNFT: (poolName: string, amount: string) => Promise<any>
    onDeposit?: (positionKey: string, amount: string) => Promise<any>
    onWithdraw?: (positionKey: string, amount: string) => Promise<any>
    onBorrow?: (positionKey: string, amount: string) => Promise<any>
    onRepay?: (positionKey: string, amount: string) => Promise<any>
    showBorrowRepay?: boolean
    onCompound?: (positionKey: string) => Promise<any>
    [key: string]: any
  }
  export function PositionNFTCard(props: PositionNFTCardProps): JSX.Element
}

declare module '@/components/pool/AuctionCard' {
  interface AuctionCardProps {
    auction: Auction
    onJoin: (auction: Auction) => void
    onCancel: (auction: Auction) => void
    onAdd: (auction: Auction) => void
    onExit: (auction: Auction, positions: any[]) => void
    canAddLiquidity: boolean
    [key: string]: any
  }
  export default function AuctionCard(props: AuctionCardProps): JSX.Element
}

declare module '@/components/pool/JoinModal' {
  interface JoinModalProps {
    isOpen: boolean
    auction: Auction | null
    onClose: () => void
    [key: string]: any
  }
  export default function JoinModal(props: JoinModalProps): JSX.Element
}

declare module '@/components/pool/SoloAddLiquidityModal' {
  interface SoloAddLiquidityModalProps {
    isOpen: boolean
    auction: Auction | null
    onClose: () => void
    onSuccess: () => void
    [key: string]: any
  }
  export default function SoloAddLiquidityModal(props: SoloAddLiquidityModalProps): JSX.Element
}

declare module '@/components/pool/ExitModal' {
  interface ExitModalProps {
    isOpen: boolean
    auction: Auction | null
    participatingPositions: any[]
    onClose: () => void
    onConfirm: (positionId: string) => Promise<void>
    isExiting: boolean
    [key: string]: any
  }
  export default function ExitModal(props: ExitModalProps): JSX.Element
}

declare module '@/components/common/ConfirmationModal' {
  interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    onCancel: () => void
    isLoading?: boolean
    [key: string]: any
  }
  export default function ConfirmationModal(props: ConfirmationModalProps): JSX.Element
}

declare module '@/components/common/ToastProvider' {
  interface Toast {
    title: string
    description?: string
    type?: 'success' | 'error' | 'pending' | 'info'
    link?: string
  }
  interface UseToastsReturn {
    addToast: (toast: Toast) => void
  }
  export function useToasts(): UseToastsReturn
}

declare module '@/components/create/CreateAuctionForm' {
  export default function CreateAuctionForm(props: any): JSX.Element
}

declare module '@/lib/poolsConfig' {
  import type { PoolsConfig } from '@/types'
  export function resolvePoolsConfig(chainId: number): PoolsConfig
}

declare module '@/lib/address' {
  export const ZERO_ADDRESS: string
}
