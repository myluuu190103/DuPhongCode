/**
 * Đọc lịch khóa học từ Google Sheet (hoặc file CSV local) và ghi ra data.json.
 *
 * Dùng trong GitHub Action:   SHEET_ID=... SHEET_GID=... node scripts/sync-sheet.mjs
 * Thử tại máy với file CSV:   node scripts/sync-sheet.mjs --file lich-khoa-hoc.csv
 *
 * ⚠ Logic đọc CSV ở đây phải khớp với phần cùng chức năng trong index.html.
 *   index.html đọc Sheet trực tiếp (cập nhật tức thì), file này tạo bản
 *   data.json dự phòng cho lúc Google lỗi. Sửa một bên nhớ sửa bên kia.
 */
import { writeFile, readFile } from 'node:fs/promises';

const COLS = ['id', 'start_date', 'end_date', 'speaker', 'course', 'location',
  'learning_mode', 'categories', 'tuition', 'href', 'thumbnail', 'description',
  'register_href'];

const HEADER_ALIASES = {
  id:            ['idrecord', 'ma', 'maso'],
  start_date:    ['tungay', 'ngaybatdau', 'ngaykhaigiang', 'batdau', 'khaigiang'],
  end_date:      ['denngay', 'ngayketthuc', 'ketthuc'],
  speaker:       ['diengia', 'giangvien', 'nguoiday'],
  course:        ['khoahoc', 'tenkhoahoc', 'sukien'],
  location:      ['diadiem', 'noihoc', 'khuvuc'],
  learning_mode: ['hinhthuc', 'hinhthuchoc'],
  categories:    ['loaikhoahoc', 'danhmuc', 'nhom', 'chuongtrinh'],
  tuition:       ['hocphi', 'chiphi'],
  href:          ['chitietlink', 'link', 'duongdan', 'lienket'],
  thumbnail:     ['thumbnail', 'anh', 'hinhanh', 'banner'],
  description:   ['mota', 'gioithieu'],
  register_href: ['dangkylink', 'linkdangky', 'ghidanh']
};

const stripVN = str => (str || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[^\w\s]/g, '')
  .toLowerCase();

const normKey = s => stripVN(s).replace(/[\s_]+/g, '');
const pad2 = n => String(n).padStart(2, '0');

const normDate = v => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let m = s.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (m) return `${pad2(m[3])}/${pad2(+m[2] + 1)}/${m[1]}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${pad2(m[3])}/${pad2(m[2])}/${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${pad2(m[1])}/${pad2(m[2])}/${m[3]}`;
  return s;
};

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  text = String(text).replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c !== '"') { field += c; continue; }
      if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function csvToRecords(text) {
  const rows = parseCSV(text).filter(r => r.some(c => String(c).trim() !== ''));
  if (!rows.length) return [];

  const header = rows.shift().map(normKey);
  const idx = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const wanted = [normKey(key), ...aliases.map(normKey)];
    const i = header.findIndex(h => wanted.includes(h));
    if (i >= 0) idx[key] = i;
  }

  if (idx.course === undefined || idx.speaker === undefined) {
    throw new Error('Sheet thiếu cột khóa học / giảng viên. Tiêu đề đọc được: ' + header.join(', '));
  }

  return rows.map(r => {
    const rec = {};
    for (const col of COLS) {
      rec[col] = idx[col] === undefined ? '' : String(r[idx[col]] ?? '').trim();
    }
    rec.start_date = normDate(rec.start_date);
    rec.end_date = normDate(rec.end_date);
    return rec;
  });
}

async function main() {
  const fileArg = process.argv.indexOf('--file');
  let csv;

  if (fileArg > -1) {
    csv = await readFile(process.argv[fileArg + 1], 'utf8');
  } else {
    const id = process.env.SHEET_ID;
    const gid = process.env.SHEET_GID || '0';
    if (!id) throw new Error('Thiếu biến môi trường SHEET_ID');

    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Google trả về HTTP ${res.status}. Kiểm tra Sheet đã chia sẻ công khai và gid "${gid}" có đúng không.`);
    }
    csv = await res.text();
    if (/^\s*</.test(csv)) {
      throw new Error('Google trả về HTML thay vì CSV — gần như chắc chắn Sheet chưa được chia sẻ công khai.');
    }
  }

  const records = csvToRecords(csv);

  // Chặn ghi đè bằng dữ liệu rỗng: thà giữ data.json cũ còn hơn xóa sạch lịch
  if (!records.length) throw new Error('Không đọc được dòng dữ liệu nào — dừng, không ghi đè data.json');

  const usable = records.filter(r => r.course && r.speaker);
  console.log(`Đọc được ${records.length} dòng, ${usable.length} dòng hợp lệ (có khóa học + giảng viên).`);

  const badDate = usable.filter(r => r.start_date && !/^\d{2}\/\d{2}\/\d{4}$/.test(r.start_date));
  if (badDate.length) {
    console.warn(`⚠ ${badDate.length} dòng có ngày bắt đầu sai định dạng dd/mm/yyyy:`);
    badDate.slice(0, 5).forEach(r => console.warn(`   - "${r.course}": "${r.start_date}"`));
  }

  await writeFile('data.json', JSON.stringify(records, null, 2) + '\n', 'utf8');
  console.log('Đã ghi data.json');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(err => { console.error('LỖI:', err.message); process.exit(1); });
}
