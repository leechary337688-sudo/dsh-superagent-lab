/** UI 里用到的中文显示名。数据层只存英文代码，显示层负责翻译。 */

import type { Profession, Rarity } from '../content/schema';
import type { Phase } from '../sim/state';

export const PHASE_LABELS: Record<Phase, string> = {
  prep: '休整期',
  combat: '作战期',
  settle: '结算期',
  finished: '已结束',
};

export const PROFESSION_LABELS: Record<Profession, string> = {
  vanguard: '先锋',
  guard: '近卫',
  defender: '重装',
  sniper: '狙击',
  caster: '术师',
  medic: '医疗',
  supporter: '辅助',
  specialist: '特种',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  1: '一星',
  2: '二星',
  3: '三星',
  4: '四星',
  5: '五星',
  6: '六星',
};
