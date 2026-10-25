import { CategoryInfo, ExpenseCategory, IncomeCategory } from '../types';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, CategoryInfo> = {
  nursing: {
    key: 'nursing',
    name: '哺育用品',
    type: 'expense',
    color: '#f59e0b', // amber
    bgLight: 'rgba(245, 158, 11, 0.15)',
    iconName: 'Milk',
    description: '奶粉、奶瓶、消毒鍋、吸乳器、溫奶器、圍兜、奶嘴等',
    presets: ['啟賦/明治配方奶', 'PPSU防脹氣奶瓶', '拋棄式奶粉袋', '電動雙邊吸乳器', '矽膠防漏圍兜', '安撫奶嘴', '蒸汽消毒烘乾鍋'],
  },
  medical: {
    key: 'medical',
    name: '醫療保健',
    type: 'expense',
    color: '#ef4444', // red/rose
    bgLight: 'rgba(239, 68, 68, 0.15)',
    iconName: 'HeartPulse',
    description: '自費疫苗、小兒科掛號、益生菌、退熱貼、耳溫槍等',
    presets: ['輪狀病毒/自費疫苗', '小兒科門診掛號費', '寶寶滴劑/D3/益生菌', '紅外線耳溫槍', '急救箱/退熱貼/吸鼻器', '保濕修護膏/屁屁膏'],
  },
  food: {
    key: 'food',
    name: '飲食',
    type: 'expense',
    color: '#10b981', // emerald
    bgLight: 'rgba(16, 185, 129, 0.15)',
    iconName: 'Utensils',
    description: '寶寶常溫副食品粥、生鮮無毒食材、寶寶米餅、水果泥等',
    presets: ['常溫寶寶副食品粥包', '有機米精/燕麥精', '無添加寶寶米餅/磨牙棒', '生鮮副食品有機食材', '寶寶水果泥/果汁'],
  },
  childcare: {
    key: 'childcare',
    name: '托育費用',
    type: 'expense',
    color: '#6366f1', // indigo
    bgLight: 'rgba(99, 102, 241, 0.15)',
    iconName: 'Building2',
    description: '托嬰中心月費、到府保母費、註冊費、延托費、臨托等',
    presets: ['公立/私立托嬰月費', '合格保母月托費', '學期註冊/材料代辦費', '臨時托育計時費', '保母三節禮金/年終分攤'],
  },
  daily: {
    key: 'daily',
    name: '日常用品',
    type: 'expense',
    color: '#06b6d4', // cyan
    bgLight: 'rgba(6, 182, 212, 0.15)',
    iconName: 'Package',
    description: '尿布、純水濕紙巾、寶寶沐浴洗髮乳、嬰兒專用洗衣精等',
    presets: ['日本一級幫/麗貝樂紙尿布', 'EDI超純水厚型濕紙巾', '溫和無淚洗髮沐浴露', '天然防蟎嬰兒洗衣精', '細軸安全棉花棒/紗布巾'],
  },
  play: {
    key: 'play',
    name: '玩樂用品',
    type: 'expense',
    color: '#ec4899', // pink
    bgLight: 'rgba(236, 72, 153, 0.15)',
    iconName: 'Sparkles',
    description: '布書繪本、固齒器、健力架、蒙特梭利早教玩具等',
    presets: ['黑白啟蒙布書/觸摸繪本', '矽膠固齒器手搖鈴', '踢踢琴多功能健力架', '蒙特梭利形狀配對積木', '寶寶安撫巾/娃娃'],
  },
  other_expense: {
    key: 'other_expense',
    name: '其他支出',
    type: 'expense',
    color: '#8b5cf6', // purple
    bgLight: 'rgba(139, 92, 246, 0.15)',
    iconName: 'MoreHorizontal',
    description: '嬰兒推車、安全座椅、嬰兒床、成長衣物、紀念寫真等',
    presets: ['雙向輕量嬰兒手推車', '0-4歲汽車安全座椅', '實木多功能嬰兒床', '換季包屁衣/連身兔裝', '彌月滿月紀念寫真'],
  },
};

export const INCOME_CATEGORIES: Record<IncomeCategory, CategoryInfo> = {
  subsidy: {
    key: 'subsidy',
    name: '政府補助',
    type: 'income',
    color: '#10b981', // emerald
    bgLight: 'rgba(16, 185, 129, 0.15)',
    iconName: 'Landmark',
    description: '中央育兒津貼、公共托育補助、縣市生育獎勵金、育嬰留停津貼',
    presets: ['每月中央育兒津貼 (NT$5,000)', '準公共托育補助 (NT$13,000)', '縣市政府第一胎生育獎勵金', '勞保育嬰留職停薪津貼'],
  },
  insurance: {
    key: 'insurance',
    name: '保險理賠',
    type: 'income',
    color: '#3b82f6', // blue
    bgLight: 'rgba(59, 130, 246, 0.15)',
    iconName: 'ShieldCheck',
    description: '新生兒實支實付醫療險、住院日額給付、門診手術理賠等',
    presets: ['新生兒實支實付醫療理賠', '住院醫療日額給付', '意外傷害門診醫療金', '防癌/重大傷病保險給付'],
  },
  gift: {
    key: 'gift',
    name: '親友贈與',
    type: 'income',
    color: '#f43f5e', // rose
    bgLight: 'rgba(244, 63, 94, 0.15)',
    iconName: 'Gift',
    description: '長輩滿月紅包、親友賀禮禮金、週歲抓周紅包等',
    presets: ['爺爺奶奶滿月祝賀紅包', '親友長輩彌月禮金', '一歲抓周週歲長命鎖禮金', '親友共購補助贊助款'],
  },
  other_income: {
    key: 'other_income',
    name: '其他收入來源',
    type: 'income',
    color: '#14b8a6', // teal
    bgLight: 'rgba(20, 184, 166, 0.15)',
    iconName: 'Coins',
    description: '二手嬰兒用品轉售、家庭共享基金注資、其他收入等',
    presets: ['二手推車/嬰兒床轉售出清', '二手寶寶衣物轉售', '夫妻共同育兒金注資', '其他退款或雜項收入'],
  },
};

export const ALL_CATEGORIES: Record<string, CategoryInfo> = {
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
};
