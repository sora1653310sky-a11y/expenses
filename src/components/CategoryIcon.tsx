import React from 'react';
import {
  Baby,
  Building2,
  Coins,
  Gift,
  HeartPulse,
  Landmark,
  Milk,
  MoreHorizontal,
  Package,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react';
import { ALL_CATEGORIES } from '../constants/categories';
import { CategoryKey } from '../types';

interface Props {
  category: CategoryKey;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<Props> = ({ category, className = 'w-4 h-4', size }) => {
  const cat = ALL_CATEGORIES[category];
  const iconName = cat?.iconName || 'Wallet';

  const props = {
    className,
    ...(size ? { size } : {}),
  };

  switch (iconName) {
    case 'Milk':
      return <Milk {...props} />;
    case 'HeartPulse':
      return <HeartPulse {...props} />;
    case 'Utensils':
      return <Utensils {...props} />;
    case 'Building2':
      return <Building2 {...props} />;
    case 'Package':
      return <Package {...props} />;
    case 'Sparkles':
      return <Sparkles {...props} />;
    case 'Landmark':
      return <Landmark {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Gift':
      return <Gift {...props} />;
    case 'Coins':
      return <Coins {...props} />;
    case 'MoreHorizontal':
      return <MoreHorizontal {...props} />;
    case 'Baby':
      return <Baby {...props} />;
    default:
      return <Wallet {...props} />;
  }
};
