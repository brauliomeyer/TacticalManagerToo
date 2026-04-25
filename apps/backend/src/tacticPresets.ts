export type SliderLevel = 0 | 1 | 2 | 3;

export interface TacticPreset {
  id: string;
  name: string;
  tempo: SliderLevel;
  pressing: SliderLevel;
  width: SliderLevel;
  mentality: SliderLevel;
  passingStyle: SliderLevel;
  defensiveLine: SliderLevel;
}

const levelLabel: Record<SliderLevel, 'low' | 'medium-low' | 'medium-high' | 'high'> = {
  0: 'low',
  1: 'medium-low',
  2: 'medium-high',
  3: 'high'
};

function styleName(mentality: SliderLevel, pressing: SliderLevel, width: SliderLevel) {
  const mentalityName = mentality <= 1 ? 'Defensive' : mentality >= 3 ? 'Attack' : 'Balanced';
  const pressingName = pressing >= 3 ? 'High Press' : pressing <= 1 ? 'Counter' : 'Control';
  const widthName = width >= 3 ? 'Wide' : width <= 1 ? 'Compact' : 'Structured';

  if (pressing >= 3 && mentality >= 3) return 'High Press Attack';
  if (width >= 3 && pressing <= 1) return 'Wide Counter Play';
  if (mentality <= 1 && width <= 1) return 'Defensive Compact';

  return `${widthName} ${pressingName} ${mentalityName}`;
}

/**
 * 64 tactical presets generated from 3 core dimensions (mentality/pressing/width),
 * while deriving the other 3 sliders to keep profiles coherent.
 */
export function generateTacticPresets(): TacticPreset[] {
  const presets: TacticPreset[] = [];

  for (let mentality = 0; mentality <= 3; mentality += 1) {
    for (let pressing = 0; pressing <= 3; pressing += 1) {
      for (let width = 0; width <= 3; width += 1) {
        const m = mentality as SliderLevel;
        const p = pressing as SliderLevel;
        const w = width as SliderLevel;

        const tempo = Math.min(3, Math.max(0, ((m + p) / 2) | 0)) as SliderLevel;
        const passingStyle = Math.min(3, Math.max(0, ((w + m) / 2) | 0)) as SliderLevel;
        const defensiveLine = Math.min(3, Math.max(0, ((p + m) / 2) | 0)) as SliderLevel;

        presets.push({
          id: `tp-${m}${p}${w}`,
          name: styleName(m, p, w),
          tempo,
          pressing: p,
          width: w,
          mentality: m,
          passingStyle,
          defensiveLine
        });
      }
    }
  }

  return presets;
}

export const sliderLegend = {
  tempo: levelLabel,
  pressing: levelLabel,
  width: levelLabel,
  mentality: levelLabel,
  passingStyle: levelLabel,
  defensiveLine: levelLabel
};
