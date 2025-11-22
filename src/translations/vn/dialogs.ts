export default {
  selectTicker: {
    title: 'Chọn Mã Cổ Phiếu',
    searchPlaceholder: 'Tìm kiếm theo mã...',
    filters: {
      all: 'Tất cả',
      stocks: 'Cổ phiếu',
      crypto: 'Tiền mã hóa',
    },
    sortBy: {
      volume: 'KL GD',
      gainers: '↑ Tăng',
      losers: '↓ Giảm',
      ma20: 'Điểm MA20',
      ma50: 'Điểm MA50',
      az: 'A-Z',
    },
    sections: {
      marketIndices: 'Chỉ Số Thị Trường',
      stocks: 'Cổ Phiếu',
      crypto: 'Tiền Mã Hóa',
      majorCrypto: 'Tiền Mã Hóa Chính',
    },
    labels: {
      marketIndex: 'Chỉ số thị trường',
      volume: 'KL',
    },
    states: {
      loading: 'Đang tải...',
      error: 'Có lỗi xảy ra',
      noTickersFound: 'Không tìm thấy mã cổ phiếu',
    },
  },
  quickAddAlert: {
    title: 'Thêm Cảnh Báo Giá',
    ticker: 'Mã CK',
    currentPrice: 'Giá Hiện Tại',
    targetPrice: 'Giá Mục Tiêu',
    alertType: 'Loại Cảnh Báo',
    distance: 'Khoảng Cách',
    triggerMessage: 'Cảnh báo kích hoạt tại',
    save: 'Lưu Cảnh Báo',
    cancel: 'Hủy',
    validation: {
      required: 'Vui lòng nhập giá mục tiêu',
      positive: 'Giá mục tiêu phải lớn hơn 0',
    },
  },
  editAlert: {
    title: 'Sửa Cảnh Báo',
    created: 'Tạo Lúc',
    status: 'Trạng Thái',
    deleteConfirm: 'Bạn có chắc chắn? Không thể hoàn tác.',
  },
}
