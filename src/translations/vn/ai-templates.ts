export default {
	sectionTitle: "Mẫu Phân Tích Nhanh",
	sectionDescription:
		"Một cú nhấp để sao chép ngữ cảnh AI với câu hỏi phân tích có sẵn",
	copyTemplate: "Sao chép kèm câu hỏi",
	templateCopied: "Đã Sao Chép!",
	templates: [
		{
			title: "Cơ Hội Giao Dịch",
			snippet:
				"Nhận diện cơ hội giao dịch, phân tích cung-cầu, lộ trình giải ngân và quản trị rủi ro cho từng mã đã chọn",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Xác định các cơ hội giao dịch có thể hành động dựa trên dữ liệu hiện tại và bối cảnh thị trường chung.\n\n2. Nhận diện hành vi 'Smart Money': Chỉ rõ các tín hiệu xác nhận (No Supply, Test for Supply, Spring, Upthrust, hay SOS) tại các vùng giá then chốt, kèm theo đánh giá sự bất đối xứng giữa Nỗ lực (Volume) và Kết quả (Giá).\n\nLƯU Ý QUAN TRỌNG: Nếu có thông báo 'Thị trường đang mở cửa', phải coi dữ liệu Volume của bản ghi cuối cùng là chưa hoàn tất. Trong trường hợp này, tuyệt đối không kết luận 'Kiệt cung' một cách khẳng định. Thay vào đó, phải đưa ra ghi chú rằng đây là tín hiệu đang hình thành và cần được xác nhận lại sau khi đóng phiên ATC.\n\n3. Thiết lập lộ trình giải ngân thực chiến: Chia rõ tỷ lệ vị thế thăm dò (tại vùng Vol thấp) và vị thế gia tăng (khi có xác nhận Nỗ lực-Kết quả), kèm theo điểm Stop Loss (SL) cụ thể dựa trên vi phạm cấu trúc Wyckoff.\n\n4. Cân nhắc tỷ lệ rủi ro-phần thưởng và các rủi ro chính cần theo dõi (Buying Climax, Upthrust, hay rủi ro từ VNINDEX).\n\nXếp hạng các mã đã chọn từ cơ hội mạnh nhất đến yếu nhất.",
		},
		{
			title: "So Sánh Hiệu Suất Cổ Phiếu",
			snippet:
				"So sánh sức mạnh hành động giá, xếp hạng MA, hành vi khối lượng và xếp hạng theo thiết lập kỹ thuật tốt nhất",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Đánh giá sức mạnh hành động giá và cấu trúc: So sánh hiệu suất giá gần đây của mỗi mã — hướng xu hướng, biến động, và chất lượng cấu trúc dao động (Đỉnh Cao Hơn/Đáy Cao Hơn rõ ràng vs. hành động gióng giụng). Xác định mã nào cho thấy cấu trúc xu hướng rõ ràng nhất.\n\n2. So sánh xếp hạng động lực MA: Với mỗi mã, đánh giá hồ sơ điểm MA Score trên tất cả các chu kỳ (MA10, MA50, MA100, MA200). Mã nào có xếp hạng MA tăng giá (hoặc ít giảm giá) nhất? Có mã nào cho thấy phân kỳ điểm MA cảnh báo kiệt sức xu hướng?\n\n3. Phân tích hành vi khối lượng và trạng thái cung-cầu: So sánh xu hướng khối lượng giữa các mã. Mã nào cho thấy xác nhận khối lượng khỏe nhất trên nhịp tăng (khối lượng tăng phiên xanh, giảm phiên đỏ)? Mã nào có dấu hiệu cảnh báo Phân Phối (khối lượng cao phiên đỏ, khối lượng thấp phiên xanh)?\n\n4. Xếp hạng và khuyến nghị: Xếp hạng tất cả các mã đã chọn từ mạnh nhất đến yếu nhất dựa trên phân tích tổng hợp hành động giá, động lực MA và khối lượng. Với mã xếp hạng cao nhất, cung cấp kế hoạch giao dịch cụ thể với vùng vào lệnh, Stop Loss và mục tiêu.\n\nTóm tắt bằng bảng so sánh hiển thị điểm xếp hạng của mỗi mã.",
		},
		{
			title: "Phân Tích Xu Hướng Thị Trường",
			snippet:
				"Phân tích luân chuyển ngành qua điểm MA, phát hiện mô hình tích lũy/phân phối của tiền thông minh và nhận diện mã dẫn dắt",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Lập bản đồ xu hướng thị trường hiện tại qua phân tích điểm MA: Với mỗi mã, báo cáo hồ sơ điểm MA Score và xác định hướng xu hướng chi phối. Nhóm các mã theo sức mạnh xu hướng — mã nào trong xu hướng tăng xác nhận (tất cả điểm MA dương), mã nào trong xu hướng giảm (tất cả âm), và mã nào trong giai đoạn chuyển tiếp (tín hiệu hỗn hợp)?\n\n2. Phát hiện mô hình tích lũy và phân phối của tiền thông minh: Tìm dấu chân khối lượng kiểu Wyckoff trên toàn nhóm. Có nhiều mã đang cho thấy dấu hiệu Tích lũy (khối lượng cạn kiệt phiên giảm, tăng phiên tăng) hay Phân Phối (khối lượng mở rộng phiên giảm, thu hẹp phiên tăng)?\n\n3. Nhận diện luân chuyển ngành và mã dẫn dắt: So sánh động lực điểm MA giữa tất cả các mã đã chọn để phát hiện luân chuyển — mã nào đang tăng động lực (điểm MA cải thiện) và mã nào đang mất động lực (điểm MA suy giảm)? Nhận diện mã dẫn dắt (sắp xếp MA mạnh nhất + xác nhận khối lượng) và mã tụt hậu.\n\n4. Dự báo thị trường có thể hành động và kế hoạch giao dịch: Dựa trên phân tích nhóm, nêu rõ tâm lý thị trường tổng thể cho các mã này là tăng, giảm hay hỗn hợp. Với thiết lập mạnh nhất, cung cấp kế hoạch giao dịch cụ thể với điểm vào, Stop Loss và mục tiêu. Xác định rủi ro then chốt có thể thay đổi dự báo (ví dụ: VNINDEX phá vỡ dưới mức hỗ trợ then chốt).\n\nXếp hạng tất cả các mã đã chọn từ tăng giá nhất đến giảm giá nhất.",
		},
		{
			title: "Phân Tích Rủi Ro & Hỗ Trợ/Kháng Cự",
			snippet:
				"Lập bản đồ hỗ trợ/kháng cự với bối cảnh khối lượng, định lượng tỷ lệ rủi ro-phần thưởng, phát hiện tín hiệu nguy hiểm Wyckoff và xác định mức Stop Loss",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Lập bản đồ các mức hỗ trợ và kháng cự then chốt với bối cảnh khối lượng: Xác định các mức hỗ trợ và kháng cự quan trọng nhất dựa trên hành động giá gần đây. Với mỗi mức, ghi nhận khối lượng đã xảy ra tại đó — mức hình thành trên khối lượng cao (>150% MA20) là ranh giới cấu trúc mạnh hơn mức hình thành trên khối lượng thấp. Đánh dấu các mức đã được kiểm tra nhiều lần.\n\n2. Định lượng tỷ lệ rủi ro-phần thưởng cho vị trí giá hiện tại: Tính khoảng cách từ giá hiện tại đến hỗ trợ gần nhất (rủi ro giảm) và kháng cự gần nhất (tiềm năng tăng). Biểu diễn dưới dạng tỷ lệ rủi ro-phần thưởng. Tỷ lệ dưới 1:2 cho thấy rủi ro lớn hơn phần thưởng tại mức hiện tại.\n\n3. Phát hiện tín hiệu nguy hiểm Wyckoff và cảnh báo khối lượng: Quét tìm cảnh báo giảm giá — Upthrust After Distribution (UTAD), khối lượng mở rộng phiên giảm trong khi thu hẹp phiên tăng, hoặc giá không tạo đỉnh mới trên khối lượng giảm. Đồng thời quét tìm tín hiệu phục hồi tăng giá — Spring tại hỗ trợ với khối lượng thấp trên thanh phá vỡ và khối lượng cao trên thanh phục hồi, hoặc Test for Supply (No Supply Bar).\n\n4. Xác định kế hoạch quản trị rủi ro: Với mỗi mã, thiết lập mức Stop Loss cụ thể dựa trên cấu trúc Wyckoff (dưới đáy Spring, dưới vùng Tích lũy, trên đỉnh Upthrust) thay vì phần trăm tùy ý. Nhận diện hành động giá hoặc mô hình khối lượng sẽ kích hoạt thoát sớm.\n\nXếp hạng các mã đã chọn từ an toàn nhất đến rủi ro nhất dựa trên hồ sơ rủi ro-phần thưởng và tính toàn vẹn cấu trúc.",
		},
		{
			title: "Tìm Kiếm Tin Tức & Sự Kiện",
			snippet:
				"Phát hiện biến động giá mạnh, tra cứu nguyên nhân, kết hợp phân tích VPA & Wyckoff",
			question:
				'Đối với mỗi mã đã chọn:\n\n1. Kiểm tra biến động cực đại: Xác định xem có thay đổi giá quá ±6.7% hoặc khối lượng (Volume) vượt >150% trung bình 20 phiên không.\n\n2. BẮT BUỘC — Thực hiện tìm kiếm internet thực tế NGAY LẬP TỨC: Nếu phát hiện biến động lớn, bạn PHẢI sử dụng công cụ tìm kiếm web NGAY LẬP TỨC để tìm tin tức gần đây về [TICKER]. Truy vấn tìm kiếm phải bao gồm tên mã, ngày và từ khóa như "báo cáo tài chính", "sự kiện doanh nghiệp", "tin tức vĩ mô". KHÔNG tự bịa hoặc bịa ra tin tức — chỉ báo cáo sự thật từ kết quả tìm kiếm thực tế. Trích dẫn URL nguồn cho mỗi thông tin. Nếu tìm kiếm không trả về kết quả nào, phải nói rõ điều đó.\n\n3. Phân tích VPA & Wyckoff: Kết hợp CHỈ thông tin đã xác minh từ tìm kiếm với dữ liệu giá/khối lượng. Đây là Nỗ lực (Effort) hay Kết quả (Result)? Đây là tin tức để "hợp thức hóa" quá trình Tích lũy hay Phân phối?\n\n4. Hành động & Quản trị: Dựa trên tin tức đã xác minh và kỹ thuật, xác định vùng kiệt cung (định lượng cụ thể), điểm vào/ra, và Stop Loss.',
		},
		{
			title: "Phân Tích Hành Động Giá Theo Bob Volman",
			snippet:
				"Nhận diện xu hướng chủ đạo, điểm vào micro pullback, thiết lập breakout/fading có xác nhận Volume và mức cắt lỗ được quản trị rủi ro",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Thiết lập xu hướng chủ đạo và cấu trúc thị trường: Xác định xu hướng hiện tại thông qua các đỉnh và đáy dao động. Nhận diện Break of Structure (BOS) hoặc Change of Character (CHoCH) gần nhất.\n\n2. Nhận diện thiết lập vào lệnh theo Volman: Quét tìm thiết lập micro pullback (3+ nến ngược xu hướng + nến đảo chiều). Với mỗi thiết lập, xác định giá vào và đánh giá khối lượng tại vùng điều chỉnh để nhận diện kiệt cung/kiệt cầu.\n\n3. Đánh giá thiết lập breakout và fading: Nhận diện thiết lập breakout tại mức dao động quan trọng (thanh biên rộng, Volume >MA20). Kiểm tra thiết lập fading tại vùng cung/cầu với mô hình từ chối (pin bar, engulfing).\n\n4. Xác định kế hoạch giao dịch hoàn chỉnh: Với thiết lập tốt nhất, cung cấp giá vào chính xác, Stop Loss (vượt mức vô hiệu hóa), và mục tiêu chốt lời (tỷ lệ rủi ro-phần thưởng tối thiểu 2:1). Nêu tiêu chí xác nhận khối lượng và tín hiệu thoát sớm.\n\nXếp hạng các mã đã chọn theo chất lượng và độ rõ ràng thiết lập.",
		},
		{
			title: "Phân Tích Hành Động Giá Theo Phương Pháp Wyckoff",
			snippet:
				"Nhận diện giai đoạn Wyckoff, sự kiện then chốt (Spring/Upthrust/SOS), mục tiêu giá ngang và xác nhận khối lượng Nỗ lực-Kết quả",
			question:
				"Đối với mỗi mã đã chọn:\n\n1. Xác định giai đoạn Wyckoff hiện tại: Phân loại vào Tích lũy (A-E), Tăng Giá, Phân Phối (A-E), hoặc Giảm Giá. Bổ sung phân loại bằng bằng chứng cụ thể từ dữ liệu giá và khối lượng.\n\n2. Nhận diện sự kiện và cấu trúc Wyckoff then chốt: Quét tìm Spring, Upthrust, Sign of Strength (SOS), Sign of Weakness (SOW), Last Point of Support (LPS), và Last Point of Supply (LPSY). Đánh dấu từng sự kiện với ngày.\n\n3. Tính toán mục tiêu giá theo phương pháp đếm ngang của Wyckoff — đo Nguyên nhân (chiều rộng vùng giao dịch) và chiếu Kết quả (mục tiêu giá). Kiểm tra xem khối lượng tại các mức then chốt có hỗ trợ chuyển động dự kiến không.\n\n4. Xác nhận bằng phân tích Nỗ lực vs Kết quả và cung cấp kế hoạch hành động: Phân kỳ nỗ lực lớn/kết quả nhỏ tại kháng cự cảnh báo Phân Phối; phân kỳ tương tự tại hỗ trợ cảnh báo hấp thụ Tích lũy. Cung cấp vùng vào lệnh, Stop Loss, hướng dẫn tỷ lệ vị thế, và hành động giá cụ thể nào sẽ làm vô hiệu luận điểm Wyckoff.\n\nXếp hạng các mã đã chọn theo độ rõ ràng và chất lượng cấu trúc Wyckoff.",
		},
	],
};
