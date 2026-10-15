export type LlamaManagerShopOffer = {
  offerId: string
  title: string
  remaining: number | null
  price: number
  currencyType: string
  currencySubType: string
  isFree: boolean
  isXRay: boolean
  bulkKind?: LlamaManagerBulkKind
  prerollItems: Array<{
    itemType: string
    quantity: number
  }>
}

export type LlamaManagerInventoryPack = {
  itemId: string
  templateId: string
  name: string
  quantity: number
  isChoicePack: boolean
  choiceOptions: Array<{
    itemType: string
    quantity: number
    index: number
  }>
}

export type LlamaManagerCurrency = {
  templateId: string
  quantity: number
  name: string
}

export type LlamaManagerAccountData = {
  accountId: string
  shop: Array<LlamaManagerShopOffer>
  inventory: Array<LlamaManagerInventoryPack>
  currencies: Array<LlamaManagerCurrency>
  error?: string
}

export type LlamaManagerPurchaseRequest = {
  accountId: string
  offerId: string
  quantity: number
  currencySubType: string
  expectedTotalPrice: number
  currencyType: string
}

/** mini = Mini Llama (voucher_basicpack); upgrade = Always.UpgradePack.01 (X-Ray tickets) */
export type LlamaManagerBulkKind = 'mini' | 'upgrade'

/** Buy llamas on many accounts at once (one button). */
export type LlamaManagerBulkPurchaseRequest = {
  accountIds: Array<string>
  quantity: number
  kind: LlamaManagerBulkKind
  /** Unit price the user confirmed; accounts whose offer price differs are skipped */
  price: number
}

export type LlamaManagerBulkPurchaseResult = {
  success: boolean
  kind: LlamaManagerBulkKind
  totalPurchased: number
  accountsOk: number
  accountsFailed: number
  perAccount: Array<{
    accountId: string
    purchased: number
    error?: string
  }>
  error?: string
}

export type LlamaManagerOpenRequest = {
  accountId: string
  itemIds: Array<string>
}

export type LlamaManagerOpenChoiceRequest = {
  accountId: string
  /** Single pack (legacy / dialog) */
  cardPackItemId?: string
  /** Bulk open all with same selection index */
  cardPackItemIds?: Array<string>
  selectionIdx: number
}

export type LlamaManagerActionResult = {
  accountId: string
  success: boolean
  opened?: number
  purchased?: number
  error?: string
  rewards?: Record<string, number>
}
