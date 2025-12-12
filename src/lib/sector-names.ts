/**
 * Sector name mappings from API keys to readable Vietnamese/English names
 *
 * Maps all sector groups from the API to user-friendly display names
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
  BAN_LE: {
    vn: 'Bán Lẻ',
    en: 'Retail'
  },

  // All sectors from API (alphabetical by key)
  BAO_HIEM: {
    vn: 'Bảo Hiểm',
    en: 'Insurance'
  },
  CONG_NGHE: {
    vn: 'Công Nghệ',
    en: 'Technology'
  },
  DAU_KHI: {
    vn: 'Dầu Khí',
    en: 'Oil & Gas'
  },
  DICH_VU_CONG_NGHIEP: {
    vn: 'Dịch Vụ Công Nghiệp',
    en: 'Industrial Services'
  },
  DIEN: {
    vn: 'Điện',
    en: 'Electric Power'
  },
  DU_LICH: {
    vn: 'Du Lịch',
    en: 'Tourism'
  },
  HANG_CA_NHAN_GIA_DUNG: {
    vn: 'Hàng Cá Nhân & Gia Dụng',
    en: 'Consumer Goods & Home Appliances'
  },
  HOA_CHAT: {
    vn: 'Hóa Chất',
    en: 'Chemicals'
  },
  OTHERS: {
    vn: 'Khác',
    en: 'Others'
  },
  OTO_PHU_TUNG: {
    vn: 'Ô Tô & Phụ Tùng',
    en: 'Automobile & Auto Parts'
  },
  TAI_NGUYEN_CO_BAN: {
    vn: 'Tài Nguyên Cơ Bản',
    en: 'Basic Resources'
  },
  THUC_PHAM: {
    vn: 'Thực Phẩm',
    en: 'Food & Beverage'
  },
  TRUYEN_THONG: {
    vn: 'Truyền Thông',
    en: 'Media & Communications'
  },
  VIEN_THONG: {
    vn: 'Viễn Thông',
    en: 'Telecommunications'
  },
  Y_TE: {
    vn: 'Y Tế',
    en: 'Healthcare & Medical'
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