import { Category } from '../types';

/**
 * Đánh giá biểu thức tính toán số tiền trực tiếp (VD: "35k + 20k", "50000 + 45000", "120k * 2", "2tr - 500k")
 * Giúp người dùng tính toán trực tiếp mà không cần mở app Máy tính (Calculator).
 */
export function evaluateMathExpression(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();

  // Chuẩn hóa các từ viết tắt tiền tệ: 50k -> 50000, 2tr -> 2000000, 1ty -> 1000000000
  s = s.replace(/([0-9]+(?:[\.,][0-9]+)?)\s*k\b/g, (_m, n) =>
    Math.round(parseFloat(n.replace(',', '.')) * 1000).toString()
  );
  s = s.replace(/([0-9]+(?:[\.,][0-9]+)?)\s*(?:tr|trieu|triệu|m)\b/g, (_m, n) =>
    Math.round(parseFloat(n.replace(',', '.')) * 1000000).toString()
  );
  s = s.replace(/([0-9]+(?:[\.,][0-9]+)?)\s*(?:ty|tỷ|b)\b/g, (_m, n) =>
    Math.round(parseFloat(n.replace(',', '.')) * 1000000000).toString()
  );

  // Chỉ kích hoạt khi có toán tử phép tính (+, -, *, /)
  if (!/[+\-*\/]/.test(s)) return null;

  try {
    // Chỉ chấp nhận ký tự an toàn: số, toán tử, dấu chấm, khoảng trắng
    if (!/^[0-9+\-*\/.\s]+$/.test(s)) return null;

    const tokens = s.match(/([0-9.]+|[+\-*\/])/g);
    if (!tokens || tokens.length < 3) return null;

    // Ưu tiên nhân (*) và chia (/) trước
    const values: number[] = [];
    const ops: string[] = [];
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === '*' || t === '/') {
        const prev = values.pop();
        const next = parseFloat(tokens[i + 1]);
        if (prev === undefined || isNaN(next)) return null;
        values.push(t === '*' ? prev * next : next !== 0 ? prev / next : 0);
        i += 2;
      } else if (t === '+' || t === '-') {
        ops.push(t);
        i++;
      } else {
        const val = parseFloat(t);
        if (isNaN(val)) return null;
        values.push(val);
        i++;
      }
    }

    // Sau đó thực hiện cộng (+) và trừ (-)
    let res = values[0];
    if (res === undefined || isNaN(res)) return null;

    for (let j = 0; j < ops.length; j++) {
      const op = ops[j];
      const val = values[j + 1];
      if (val === undefined || isNaN(val)) return null;
      if (op === '+') res += val;
      if (op === '-') res -= val;
    }

    return res > 0 ? Math.round(res) : null;
  } catch {
    return null;
  }
}

/**
 * Tự động đoán danh mục thông minh theo nội dung người dùng gõ trong ô Ghi chú.
 * Tiết kiệm tối đa thời gian chọn danh mục bằng tay.
 */
export function detectCategoryFromNote(
  note: string,
  categories: Category[]
): { category: Category; matchedType: 'expense' | 'income' } | null {
  if (!note || note.trim().length < 2) return null;
  const n = note.toLowerCase().trim();

  // Từ khóa đặc trưng theo từng nhóm chi tiêu / thu nhập phổ biến của người Việt
  const keywordMap: { keywords: string[]; catKeywords: string[]; type: 'expense' | 'income' }[] = [
    // 1. Ăn uống & Cà phê
    {
      keywords: [
        'ăn', 'cơm', 'phở', 'bún', 'bánh mì', 'hủ tiếu', 'cà phê', 'cafe', 'cf', 'trà sữa',
        'trà chanh', 'nước mía', 'ăn sáng', 'ăn trưa', 'ăn tối', 'lẩu', 'nướng', 'bbq',
        'buffet', 'nhậu', 'bia', 'uống nước', 'đi chợ', 'siêu thị', 'winmart', 'coop',
        'bách hóa xanh', 'thịt', 'cá', 'trứng', 'sữa', 'trái cây', 'hoa quả', 'ăn vặt',
        'chè', 'bánh tráng', 'bún bò', 'bún chả', 'gà rán', 'pizza', 'highlands', 'phúc long',
        'starbucks', 'katinat', 'mixue', 'tocotoco'
      ],
      catKeywords: ['ăn uống', 'cà phê', 'ẩm thực', 'food'],
      type: 'expense',
    },
    // 2. Đi lại & Xăng xe
    {
      keywords: [
        'xăng', 'đổ xăng', 'xe máy', 'ô tô', 'nhớt', 'thay nhớt', 'rửa xe', 'sửa xe',
        'vá xe', 'bơm xe', 'gửi xe', 'bãi xe', 'vé xe', 'vé tàu', 'vé phà', 'grab',
        'be', 'gojek', 'taxi', 'mai linh', 'xsm', 'vinfast', 'xanh sm', 'bot', 'trạm thu phí',
        'bảo hiểm xe', 'đăng kiểm', 'dầu nhớt'
      ],
      catKeywords: ['đi lại', 'xăng', 'giao thông', 'transport', 'xe'],
      type: 'expense',
    },
    // 3. Hóa đơn & Tiện ích
    {
      keywords: [
        'tiền điện', 'điện lực', 'evn', 'tiền nước', 'nước sinh hoạt', 'wifi', 'internet',
        'mạng viettel', 'mạng fpt', 'mạng vnpt', '4g', '5g', 'nạp đt', 'nạp điện thoại',
        'thẻ cào', 'tiền rác', 'vệ sinh', 'truyền hình', 'phí quản lý', 'dịch vụ chung cư'
      ],
      catKeywords: ['hóa đơn', 'tiện ích', 'bill'],
      type: 'expense',
    },
    // 4. Nhà cửa & Tiền thuê
    {
      keywords: [
        'tiền nhà', 'tiền phòng', 'thuê nhà', 'thuê phòng', 'đặt cọc', 'nội thất',
        'sửa nhà', 'bàn', 'ghế', 'giường', 'tủ', 'quạt', 'điều hòa', 'máy giặt', 'tủ lạnh'
      ],
      catKeywords: ['nhà', 'thuê', 'housing'],
      type: 'expense',
    },
    // 5. Mua sắm & Tiêu dùng
    {
      keywords: [
        'shopee', 'lazada', 'tiki', 'tiktok shop', 'mua sắm', 'quần áo', 'váy', 'áo',
        'quần', 'giày', 'dép', 'túi xách', 'balo', 'đồng hồ', 'mỹ phẩm', 'son', 'kem dưỡng',
        'nước hoa', 'dầu gội', 'sữa tắm', 'đồ gia dụng', 'siêu thị'
      ],
      catKeywords: ['mua sắm', 'tiêu dùng', 'shopping'],
      type: 'expense',
    },
    // 6. Sức khỏe & Y tế
    {
      keywords: [
        'thuốc', 'nhà thuốc', 'long châu', 'an khang', 'pharmacity', 'khám', 'bác sĩ',
        'bệnh viện', 'nha khoa', 'răng', 'nhổ răng', 'niềng răng', 'xét nghiệm', 'vitamin',
        'thực phẩm chức năng', 'gym', 'yoga', 'thể thao', 'cắt tóc', 'gội đầu', 'spa'
      ],
      catKeywords: ['sức khỏe', 'y tế', 'health'],
      type: 'expense',
    },
    // 7. Giải trí & Du lịch
    {
      keywords: [
        'xem phim', 'cgv', 'lotte', 'bhd', 'netflix', 'spotify', 'youtube premium', 'game',
        'nạp game', 'steam', 'du lịch', 'khách sạn', 'homestay', 'resort', 'vé máy bay',
        'vietnam airlines', 'vietjet', 'karaoke', 'bar', 'pub', 'boardgame'
      ],
      catKeywords: ['giải trí', 'du lịch', 'entertainment'],
      type: 'expense',
    },
    // 8. Giáo dục & Khóa học
    {
      keywords: [
        'học phí', 'khóa học', 'sách', 'mua sách', 'vở', 'bút', 'tiếng anh', 'ielts',
        'toeic', 'học thêm', 'gia sư', 'udemy', 'coursera', 'đại học', 'trường'
      ],
      catKeywords: ['giáo dục', 'khóa học', 'education'],
      type: 'expense',
    },
    // 9. Lương cố định (Thu nhập)
    {
      keywords: [
        'lương', 'tiền lương', 'nhận lương', 'lương cứng', 'lương tháng', 'lương công ty',
        'chuyển lương', 'tạm ứng lương', 'salary'
      ],
      catKeywords: ['lương', 'salary'],
      type: 'income',
    },
    // 10. Thưởng & Hoa hồng (Thu nhập)
    {
      keywords: [
        'thưởng', 'tiền thưởng', 'thưởng tết', 'thưởng quý', 'thưởng kpi', 'thưởng nóng',
        'hoa hồng', 'tiền hoa hồng', 'commission', 'bonus'
      ],
      catKeywords: ['thưởng', 'hoa hồng', 'bonus'],
      type: 'income',
    },
    // 11. Đầu tư & Lãi (Thu nhập)
    {
      keywords: [
        'tiền lãi', 'lãi suất', 'lãi ngân hàng', 'tiền lời', 'sinh lời', 'cổ tức',
        'chứng khoán', 'tiết kiệm', 'lãi tiết kiệm', 'bán vàng'
      ],
      catKeywords: ['đầu tư', 'lãi', 'invest'],
      type: 'income',
    },
  ];

  for (const item of keywordMap) {
    // Kiểm tra xem note có chứa từ khóa nào không
    const matched = item.keywords.some((kw) => {
      // Regex so khớp ranh giới từ hoặc cụm từ
      return n.includes(kw);
    });

    if (matched) {
      // Tìm category phù hợp trong danh sách category của người dùng
      const cat = categories.find((c) => {
        if (c.type !== item.type) return false;
        const cNameLower = c.name.toLowerCase();
        return item.catKeywords.some((ckw) => cNameLower.includes(ckw));
      });

      if (cat) {
        return { category: cat, matchedType: item.type };
      }
    }
  }

  return null;
}

/**
 * Gợi ý các thẻ ghi chú nhanh theo danh mục được chọn (1 chạm điền ghi chú).
 */
export function getQuickNoteTagsForCategory(categoryName: string, categoryType: 'expense' | 'income'): string[] {
  const nameLower = (categoryName || '').toLowerCase();

  if (categoryType === 'income') {
    if (nameLower.includes('lương')) return ['Lương công ty', 'Lương tạm ứng', 'Lương tháng này'];
    if (nameLower.includes('thưởng') || nameLower.includes('hoa hồng')) return ['Thưởng KPI', 'Hoa hồng dự án', 'Thưởng nóng', 'Thưởng chuyên cần'];
    if (nameLower.includes('đầu tư') || nameLower.includes('lãi')) return ['Lãi tiết kiệm', 'Lãi sinh lời', 'Cổ tức', 'Chốt lời'];
    return ['Khách hàng thanh toán', 'Thu nhập thêm', 'Thu tiền bán đồ cũ', 'Được biếu / tặng'];
  }

  // Expense
  if (nameLower.includes('ăn uống') || nameLower.includes('cà phê') || nameLower.includes('ẩm thực')) {
    return ['Cà phê', 'Ăn sáng', 'Ăn trưa', 'Ăn tối', 'Đi chợ / Siêu thị', 'Trà sữa', 'Ăn vặt'];
  }
  if (nameLower.includes('đi lại') || nameLower.includes('xăng') || nameLower.includes('xe')) {
    return ['Đổ xăng', 'Gửi xe', 'Rửa xe', 'Thay nhớt xe', 'Grab / Taxi'];
  }
  if (nameLower.includes('hóa đơn') || nameLower.includes('tiện ích')) {
    return ['Tiền điện', 'Tiền nước', 'Tiền mạng Wifi', 'Nạp thẻ 4G', 'Tiền rác sinh hoạt'];
  }
  if (nameLower.includes('nhà') || nameLower.includes('thuê')) {
    return ['Tiền thuê phòng', 'Tiền thuê nhà', 'Phí quản lý tòa nhà', 'Sửa chữa đồ dùng'];
  }
  if (nameLower.includes('mua sắm') || nameLower.includes('tiêu dùng')) {
    return ['Đồ dùng sinh hoạt', 'Quần áo mới', 'Đơn hàng Shopee', 'Mỹ phẩm', 'Đồ gia dụng'];
  }
  if (nameLower.includes('sức khỏe') || nameLower.includes('y tế')) {
    return ['Mua thuốc', 'Khám bác sĩ', 'Nha khoa', 'Phí tập Gym / Yoga', 'Cắt tóc gội đầu'];
  }
  if (nameLower.includes('giải trí') || nameLower.includes('du lịch')) {
    return ['Xem phim chiếu rạp', 'Cà phê gặp bạn bè', 'Nạp game', 'Vé du lịch', 'Hát Karaoke'];
  }
  if (nameLower.includes('giáo dục') || nameLower.includes('khóa học')) {
    return ['Học phí', 'Mua sách vở', 'Khóa học online', 'Học ngoại ngữ'];
  }

  return ['Chi tiêu phát sinh', 'Tiêu dùng cá nhân', 'Mua đồ tạp hóa'];
}

/**
 * Các mốc tiền chi tiêu phổ biến của người Việt (1 chạm là xong)
 */
export const POPULAR_AMOUNT_PRESETS = [
  { label: '20k', value: 20000 },
  { label: '30k', value: 30000 },
  { label: '50k', value: 50000 },
  { label: '100k', value: 100000 },
  { label: '200k', value: 200000 },
  { label: '500k', value: 500000 },
  { label: '1 Tr', value: 1000000 },
];
