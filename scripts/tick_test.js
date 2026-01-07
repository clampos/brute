// Small script to reproduce tick computation used in src/screens/Metrics.tsx

function computeTicks(values, valueKey) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataRange = dataMax - dataMin || 1;
  const padding = dataRange * 0.1;
  const rawMin = dataMin - padding;
  const rawMax = dataMax + padding;
  const targetTicks = 5;
  const rawStep = (rawMax - rawMin) / (targetTicks - 1) || 1;
  const niceSteps = [1, 2, 2.5, 5, 10];
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  let step = magnitude;
  for (let n of niceSteps) {
    if (n * magnitude >= rawStep) {
      step = n * magnitude;
      break;
    }
  }
  let yMin = Math.floor(rawMin / step) * step;
  let yMax = Math.ceil(rawMax / step) * step;
  if (yMax === yMin) yMax = yMin + step;
  let decimals = 0;
  if (step < 1) {
    decimals = Math.max(1, -Math.floor(Math.log10(step)));
  }
  if (valueKey === "weight") decimals = Math.max(decimals, 1);
  const ticks = [];
  for (let i = 0; i < targetTicks; i++) {
    const value = yMin + step * i;
    ticks.push(value.toFixed(decimals));
  }
  return { yMin, yMax, step, ticks };
}

const bodyweightSample = [80.12, 80.5, 80.3, 80.0, 80.25];
const bodyfatSample = [14.6, 14.7, 14.5, 14.6, 14.55];

console.log("Bodyweight sample:", bodyweightSample);
console.log(computeTicks(bodyweightSample, "weight"));
console.log("\nBodyfat sample:", bodyfatSample);
console.log(computeTicks(bodyfatSample, "bodyfat"));
