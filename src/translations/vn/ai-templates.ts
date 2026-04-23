export default {
  sectionTitle: 'Mẫu Phân Tích Nhanh',
  sectionDescription: 'Một cú nhấp để sao chép ngữ cảnh AI với câu hỏi phân tích có sẵn',
  copyTemplate: 'Sao chép kèm câu hỏi',
  templateCopied: 'Đã Sao Chép!',
  templates: [
    {
      title: 'So Sánh Hiệu Suất Cổ Phiếu',
      snippet: 'So sánh cổ phiếu qua hành động giá, xu hướng khối lượng và động lực MA để tìm thiết lập kỹ thuật mạnh nhất',
      question: 'So sánh các cổ phiếu đã chọn dựa trên hành động giá, xu hướng khối lượng, và động lực điểm MA. Xếp hạng tất cả các cổ phiếu đã chọn từ mạnh nhất đến yếu nhất dựa trên thiết lập kỹ thuật và giải thích tại sao mỗi cổ phiếu nổi bật hoặc yếu đi từ góc độ hành động giá.',
    },
    {
      title: 'Phân Tích Xu Hướng Thị Trường',
      snippet: 'Phân tích xu hướng thị trường, các mô hình động lực và xác định cơ hội giao dịch dựa trên điểm MA và xu hướng khối lượng',
      question: 'Dựa trên dữ liệu thị trường được cung cấp, phân tích xu hướng thị trường hiện tại từ góc độ hành động giá và làm nổi bật các mô hình đáng chú ý trong điểm MA cho thấy cơ hội giao dịch tiềm năng. Tâm lý thị trường tổng thể dựa trên hành động giá và khối lượng là gì?',
    },
    {
      title: 'Phân Tích Rủi Ro & Hỗ Trợ/Kháng Cự',
      snippet: 'Xác định các mức hỗ trợ và kháng cự chính, phân tích tỷ lệ rủi ro-phần thưởng và phát hiện dấu hiệu cảnh báo hoặc tín hiệu tăng',
      question: 'Đối với mỗi mã đã chọn, xác định các mức hỗ trợ và kháng cự chính dựa trên hành động giá gần đây. Phân tích tỷ lệ rủi ro-phần thưởng hiện tại từ góc độ hành động giá và làm nổi bật bất kỳ dấu hiệu cảnh báo hoặc xác nhận tăng giá tiềm năng trong dữ liệu.',
    },
    {
      title: 'Tìm Kiếm Tin Tức & Sự Kiện',
      snippet: 'Tìm tin tức và sự kiện gần đây giải thích cho biến động giá mạnh hoặc khối lượng bất thường',
      question: 'Kiểm tra xem có mã nào thay đổi quá ±6.7% trong ngày hoặc khối lượng bất thường không. Đối với mỗi biến động lớn, bạn PHẢI chủ động tìm kiếm trên internet để thu thập tin tức và sự kiện gần đây nhằm hiểu nguyên nhân. Bắt đầu phân tích bằng cách nói "Tôi đang tìm kiếm tin tức gần đây về kết quả kinh doanh, sự kiện doanh nghiệp và bối cảnh thị trường chung cho [TICKER]." Sau đó tiến hành tìm kiếm và báo cáo kết quả.',
    },
    {
      title: 'Phân Tích Hành Động Giá Theo Bob Volman',
      snippet: 'Áp dụng phương pháp scalping hành động giá của Bob Volman để nhận diện điểm vào lệnh theo mô hình điều chỉnh vi mô, xác nhận phá vỡ và thiết lập giao dịch ngược xu hướng tại vùng cản',
      question: 'Phân tích mỗi mã đã chọn theo phương pháp hành động giá của Bob Volman từ "Forex Price Action Scalping". Đối với mỗi mã: (1) Xác định xu hướng chủ đạo trên khung thời gian hiện tại thông qua các đỉnh và đáy dao động. (2) Tìm các thiết lập micro pullback — nhịp điều chỉnh 3+ nến liên tiếp ngược xu hướng, theo sau bởi nến đảo chiều hoặc nến breakout. (3) Nhận diện các thiết lập breakout khi giá phá vỡ một mức quan trọng với động lực mạnh. (4) Kiểm tra các thiết lập fading tại vùng hỗ trợ/kháng cự chính khi hành động giá cho thấy mô hình từ chối (pin bar, engulfing). (5) Đánh giá hành vi khối lượng tại các mức quan trọng để xác nhận hoặc phủ nhận từng thiết lập. Xếp hạng mỗi mã theo chất lượng thiết lập và đưa ra các mức vào lệnh, cắt lỗ, chốt lời cụ thể.',
    },
    {
      title: 'Phân Tích Hành Động Giá Theo Phương Pháp Wyckoff',
      snippet: 'Áp dụng Phương Pháp Wyckoff để nhận diện giai đoạn tích lũy/phân phối, mô hình spring/upthrust và tính toán mục tiêu giá',
      question: 'Phân tích mỗi mã đã chọn theo Phương Pháp Wyckoff. Đối với mỗi mã: (1) Xác định giai đoạn Wyckoff hiện tại — Tích lũy (A–E), Tăng Giá, Phân Phối (A–E), hoặc Giảm Giá dựa trên hành vi giá và khối lượng. (2) Nhận diện các sự kiện Wyckoff quan trọng: Spring (phá vỡ giả dưới hỗ trợ), Upthrust (phá vỡ giả trên kháng cự), Sign of Strength (SOS), Sign of Weakness (SOW), Last Point of Support (LPS), và Last Point of Supply (LPSY). (3) Đo lường nguyên nhân (chiều rộng vùng tích lũy/phân phối) và ước tính mục tiêu giá theo phương pháp đếm ngang của Wyckoff. (4) Phân tích mô hình khối lượng — so sánh nỗ lực và kết quả — để xác nhận dòng tiền thông minh đang tích lũy hay phân phối. (5) So sánh cấu trúc Wyckoff giữa các mã và chỉ ra mã nào có thiết lập giao dịch rõ ràng nhất.',
    },
  ],
}
