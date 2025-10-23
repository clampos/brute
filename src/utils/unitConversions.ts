// Unit conversion utilities

export type UnitSystem = 'metric' | 'imperial';

// Height conversions
export const cmToFeetAndInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

export const feetAndInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54 * 10) / 10; // Round to 1 decimal
};

// Weight conversions
export const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462 * 10) / 10; // Round to 1 decimal
};

export const lbsToKg = (lbs: number): number => {
  return Math.round(lbs / 2.20462 * 10) / 10; // Round to 1 decimal
};

export const kgToStone = (kg: number): { stone: number; lbs: number } => {
  const totalLbs = kg * 2.20462;
  const stone = Math.floor(totalLbs / 14);
  const lbs = Math.round(totalLbs % 14);
  return { stone, lbs };
};

export const stoneAndLbsToKg = (stone: number, lbs: number): number => {
  const totalLbs = stone * 14 + lbs;
  return Math.round(totalLbs / 2.20462 * 10) / 10; // Round to 1 decimal
};

// Format display values
export const formatHeight = (cm: number | null, system: UnitSystem): string => {
  if (!cm) return 'Not set';
  
  if (system === 'metric') {
    return `${cm} cm`;
  } else {
    const { feet, inches } = cmToFeetAndInches(cm);
    return `${feet}' ${inches}"`;
  }
};

export const formatWeight = (kg: number | null, system: UnitSystem, useStone: boolean = false): string => {
  if (!kg) return 'Not set';
  
  if (system === 'metric') {
    return `${kg} kg`;
  } else {
    if (useStone) {
      const { stone, lbs } = kgToStone(kg);
      return `${stone} st ${lbs} lbs`;
    } else {
      return `${kgToLbs(kg)} lbs`;
    }
  }
};

// Local storage helpers
export const getUnitPreference = (): UnitSystem => {
  const saved = localStorage.getItem('unitSystem');
  return (saved === 'imperial' ? 'imperial' : 'metric') as UnitSystem;
};

export const setUnitPreference = (system: UnitSystem): void => {
  localStorage.setItem('unitSystem', system);
};

export const getWeightDisplayPreference = (): 'lbs' | 'stone' => {
  const saved = localStorage.getItem('imperialWeightType');
  return (saved === 'stone' ? 'stone' : 'lbs') as 'lbs' | 'stone';
};

export const setWeightDisplayPreference = (type: 'lbs' | 'stone'): void => {
  localStorage.setItem('imperialWeightType', type);
};