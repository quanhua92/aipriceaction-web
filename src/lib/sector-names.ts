/**
 * Sector name mappings from API keys to readable Vietnamese/English names
 *
 * Maps all 27 sector groups from the API to user-friendly display names
 * Source: https://api.aipriceaction.com/tickers/group
 */

export interface SectorName {
  vn: string  // Vietnamese name
  en: string  // English name
}

/**
 * Complete mapping of all sector groups to readable names
 */
export const SECTOR_NAMES: Record<string, SectorName> = {
  // Priority sectors (most common)
  NGAN_HANG: {
    vn: 'Ngân Hàng',
    en: 'Banking'
  },
  CHUNG_KHOAN: {
    vn: 'Chứng Khoán',
    en: 'Securities'
  },
  BAT_DONG_SAN: {
    vn: 'Bất Động Sản',
    en: 'Real Estate'
  },
  XAY_DUNG: {
    vn: 'Xây Dựng',
    en: 'Construction'
  },
  THEP: {
    vn: 'Thép',
    en: 'Steel'
  },
  BAN_LE: {
    vn: 'Bán Lẻ',
    en: 'Retail'
  },

  // Other sectors (alphabetical by key)
  BAO_HIEM: {
    vn: 'Bảo Hiểm',
    en: 'Insurance'
  },
  BAT_DONG_SAN_KCN: {
    vn: 'BĐS Khu Công Nghiệp',
    en: 'Industrial Real Estate'
  },
  CAO_SU: {
    vn: 'Cao Su',
    en: 'Rubber'
  },
  CONG_NGHE: {
    vn: 'Công Nghệ',
    en: 'Technology'
  },
  DAU_KHI: {
    vn: 'Dầu Khí',
    en: 'Oil & Gas'
  },
  DAU_TU_CONG: {
    vn: 'Đầu Tư Công',
    en: 'Public Investment'
  },
  DET_MAY: {
    vn: 'Dệt May',
    en: 'Textile & Garment'
  },
  HANG_KHONG: {
    vn: 'Hàng Không',
    en: 'Aviation'
  },
  HOA_CHAT: {
    vn: 'Hóa Chất',
    en: 'Chemicals'
  },
  KHAI_KHOANG: {
    vn: 'Khai Khoáng',
    en: 'Mining'
  },
  NANG_LUONG: {
    vn: 'Năng Lượng',
    en: 'Energy'
  },
  NHUA: {
    vn: 'Nhựa',
    en: 'Plastics'
  },
  NONG_NGHIEP: {
    vn: 'Nông Nghiệp',
    en: 'Agriculture'
  },
  OTHERS: {
    vn: 'Khác',
    en: 'Others'
  },
  PENNY: {
    vn: 'Penny',
    en: 'Penny Stocks'
  },
  SUC_KHOE: {
    vn: 'Sức Khỏe',
    en: 'Healthcare'
  },
  THUC_PHAM: {
    vn: 'Thực Phẩm',
    en: 'Food & Beverage'
  },
  THUY_SAN: {
    vn: 'Thủy Sản',
    en: 'Seafood'
  },
  VAN_TAI: {
    vn: 'Vận Tải',
    en: 'Transportation'
  },
  VLXD: {
    vn: 'Vật Liệu Xây Dựng',
    en: 'Building Materials'
  },
  XAY_LAP_DIEN: {
    vn: 'Xây Lắp Điện',
    en: 'Electrical Installation'
  }
}

/**
 * Get sector display name in specified language
 * @param sectorKey - API sector key (e.g., "NGAN_HANG")
 * @param language - Language code ('vn' for Vietnamese, 'en' for English)
 * @returns Readable sector name, or the original key if not found
 */
export function getSectorDisplayName(sectorKey: string, language: 'vn' | 'en' = 'vn'): string {
  const sector = SECTOR_NAMES[sectorKey]
  if (!sector) {
    // Fallback: return the key itself if mapping not found
    return sectorKey
  }
  return sector[language]
}

/**
 * Get sector name in bilingual format (Vietnamese / English)
 * @param sectorKey - API sector key (e.g., "NGAN_HANG")
 * @returns Bilingual name (e.g., "Ngân Hàng / Banking"), or the original key if not found
 */
export function getSectorBilingualName(sectorKey: string): string {
  const sector = SECTOR_NAMES[sectorKey]
  if (!sector) {
    return sectorKey
  }
  return `${sector.vn} / ${sector.en}`
}

/**
 * Check if a sector key has a mapping
 * @param sectorKey - API sector key to check
 * @returns true if mapping exists
 */
export function hasSectorMapping(sectorKey: string): boolean {
  return sectorKey in SECTOR_NAMES
}

/**
 * Get all sector keys that have mappings
 * @returns Array of all mapped sector keys
 */
export function getAllSectorKeys(): string[] {
  return Object.keys(SECTOR_NAMES)
}
