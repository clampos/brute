// Unit conversion utilities
// Height conversions
export const cmToFeetAndInches = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
};
export const feetAndInchesToCm = (feet, inches) => {
    const totalInches = feet * 12 + inches;
    return Math.round(totalInches * 2.54 * 10) / 10; // Round to 1 decimal
};
// Weight conversions
export const kgToLbs = (kg) => {
    return Math.round(kg * 2.20462 * 10) / 10; // Round to 1 decimal
};
export const lbsToKg = (lbs) => {
    return Math.round(lbs / 2.20462 * 10) / 10; // Round to 1 decimal
};
export const kgToStone = (kg) => {
    const totalLbs = kg * 2.20462;
    const stone = Math.floor(totalLbs / 14);
    const lbs = Math.round(totalLbs % 14);
    return { stone, lbs };
};
export const stoneAndLbsToKg = (stone, lbs) => {
    const totalLbs = stone * 14 + lbs;
    return Math.round(totalLbs / 2.20462 * 10) / 10; // Round to 1 decimal
};
// Format display values
export const formatHeight = (cm, system) => {
    if (!cm)
        return 'Not set';
    if (system === 'metric') {
        return `${cm} cm`;
    }
    else {
        const { feet, inches } = cmToFeetAndInches(cm);
        return `${feet}' ${inches}"`;
    }
};
export const formatWeight = (kg, system, useStone = false) => {
    if (!kg)
        return 'Not set';
    if (system === 'metric') {
        return `${kg} kg`;
    }
    else {
        if (useStone) {
            const { stone, lbs } = kgToStone(kg);
            return `${stone} st ${lbs} lbs`;
        }
        else {
            return `${kgToLbs(kg)} lbs`;
        }
    }
};
// Local storage helpers
export const getUnitPreference = () => {
    const saved = localStorage.getItem('unitSystem');
    return (saved === 'imperial' ? 'imperial' : 'metric');
};
export const setUnitPreference = (system) => {
    localStorage.setItem('unitSystem', system);
};
export const getWeightDisplayPreference = () => {
    const saved = localStorage.getItem('imperialWeightType');
    return (saved === 'stone' ? 'stone' : 'lbs');
};
export const setWeightDisplayPreference = (type) => {
    localStorage.setItem('imperialWeightType', type);
};
