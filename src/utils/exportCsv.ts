import { ALL_CATEGORIES } from '../constants/categories';
import { CoupleProfile, Transaction } from '../types';

export function formatPayerName(paidBy: string, couple: CoupleProfile): string {
  if (paidBy === 'dad') return `${couple.dadName} (爸爸)`;
  if (paidBy === 'mom') return `${couple.momName} (媽媽)`;
  return '夫妻共同基金';
}

export function formatSplitName(split: string): string {
  switch (split) {
    case 'split_50_50':
      return '夫妻共同平攤 (依薪資比例)';
    case 'paid_in_full':
      return '個人自行吸收 (100%)';
    case 'joint_fund':
      return '由共同育兒基金支出';
    default:
      return split;
  }
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  couple: CoupleProfile,
  fileNamePrefix: string = '寶寶收支帳簿',
  options?: { maskSensitiveNotes?: boolean; anonymousNames?: boolean }
) {
  const headers = [
    '交易編號',
    '交易日期',
    '收支類型',
    '分類類別',
    '項目摘要',
    '交易金額(TWD)',
    '付款人',
    '記錄人',
    '分攤模式',
    '關聯標籤',
    '詳細備註',
    '建立時間',
  ];

  const rows = transactions.map(tx => {
    const cat = ALL_CATEGORIES[tx.category];
    const catName = cat ? cat.name : tx.category;
    const typeName = tx.type === 'expense' ? '支出' : '收入';
    const payerStr = options?.anonymousNames
      ? tx.paidBy === 'dad'
        ? '家長A (爸爸)'
        : tx.paidBy === 'mom'
        ? '家長B (媽媽)'
        : '共同基金'
      : formatPayerName(tx.paidBy, couple);
    const recorderStr = options?.anonymousNames
      ? tx.recordedBy === 'dad'
        ? '家長A'
        : '家長B'
      : tx.recordedBy === 'dad'
      ? couple.dadName
      : couple.momName;
    const splitStr = formatSplitName(tx.splitMethod);
    const tagsStr = (tx.tags || []).join('; ');
    const noteStr = options?.maskSensitiveNotes ? '[已脫敏隱藏]' : (tx.note || '').replace(/"/g, '""');
    const titleStr = tx.title.replace(/"/g, '""');
    const createdAtStr = new Date(tx.createdAt).toLocaleString('zh-TW');

    return [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${typeName}"`,
      `"${catName}"`,
      `"${titleStr}"`,
      tx.amount,
      `"${payerStr}"`,
      `"${recorderStr}"`,
      `"${splitStr}"`,
      `"${tagsStr}"`,
      `"${noteStr}"`,
      `"${createdAtStr}"`,
    ].join(',');
  });

  // UTF-8 BOM is required for Excel to display Traditional Chinese without mojibake
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileNamePrefix}_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
