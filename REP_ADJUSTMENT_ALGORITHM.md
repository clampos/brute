# Rep Adjustment Algorithm Implementation

## Overview

Implemented a two-step ensemble algorithm for suggesting reps when users manually update exercise weights:
1. **1RM Ensemble Estimation**: Average of 4 formulas (Epley, Brzycki, Lombardi, Mayhew)
2. **Percentage Table Lookup**: Match estimated 1RM against a percentage-of-1RM table with linear interpolation

## Files Created/Modified

### Backend

**Created: `server/utils/repAdjustmentService.ts`**
- Core implementation of rep adjustment algorithm
- Exports:
  - `getSuggestedReps(lastWeight, lastReps, newWeight)` - Main function
  - `estimate1RM(lastWeight, lastReps)` - Ensemble 1RM calculation
  - `estimate1RMForDisplay(weight, reps)` - Epley-only for display

**Modified: `server/auth.ts`**
- Added import for `getSuggestedReps`
- New endpoint: `POST /auth/suggest-reps`
  - Request: `{ lastWeight, lastReps, newWeight }`
  - Response: `{ suggestedReps, source }`

### Frontend

**Created: `src/utils/repAdjustmentUtils.ts`**
- TypeScript implementation of the same algorithm for client-side use
- Same exports as backend service

**Modified: `src/screens/Workouts.tsx`**
- Added import for `getSuggestedReps` and `estimate1RM`
- Updated `finalizeWeightChange()` to use ensemble 1RM estimation
- Replaced `calculateRepsFromOneRepMax()` calls with `getSuggestedReps()` calls
- Now cascades weight changes through sets using the new algorithm

### Testing

**Created: `test_rep_adjustment.js`**
- Comprehensive Node.js test suite with 7 test cases
- All tests passing ✅
- Tests cover:
  - Basic progression (weight increase)
  - Same weight (no change)
  - Deload scenarios (lighter weight)
  - Single rep max
  - High rep endurance work
  - Slight increases
  - Major decreases with capping

**Created: `debug_table_lookup.js`**
- Debugging utility to verify percentage table lookup logic
- Helps validate interpolation between table entries

## Algorithm Details

### Step 1: Estimate 1RM from Last Known Set

Given `lastWeight` and `lastReps`, calculate four estimates:

```
epley   = lastWeight * (1 + lastReps / 30)
brzycki = lastWeight * (36 / (37 - lastReps))  [only if reps < 37]
lombardi = lastWeight * (lastReps ^ 0.10)
mayhew  = (100 * lastWeight) / (52.2 + 41.9 * e^(-0.055 * lastReps))

oneRM = average(valid_estimates)
```

### Step 2: Lookup Reps from Percentage Table

Percentage of 1RM table (empirically derived):
```
reps | % of 1RM
-----|----------
  1  |  1.00
  2  |  0.97
  3  |  0.94
  4  |  0.91
  5  |  0.87
  6  |  0.85
  7  |  0.83
  8  |  0.80
  9  |  0.77
 10  |  0.75
 11  |  0.73
 12  |  0.70
 13  |  0.68
 14  |  0.66
 15  |  0.65
 20  |  0.60
```

For new weight:
```
pct = newWeight / oneRM
suggestedReps = lookup_closest_rep(pct)
```

Uses linear interpolation for values between table entries.

### Step 3: Clamp Output

```
return clamp(suggestedReps, 1, 20)
```

## Key Design Decisions

1. **Ensemble 1RM vs Epley-only**: The ensemble method provides better accuracy across different rep ranges
   - Epley: More accurate for 5-15 reps
   - Brzycki: Reliable for 2-10 reps
   - Lombardi: Useful for very high and very low reps
   - Mayhew: Good for extreme rep ranges

2. **Percentage Table with Interpolation**: Instead of just rounding to closest table entry, linear interpolation provides smoother transitions between entries

3. **Capping at 20 reps**: Prevents unrealistic endurance suggestions from very light weights; combines with 60% floor to maintain functional range

4. **Frontend Integration**: Cascade weight changes through sets while respecting the ensemble algorithm for consistency

## Testing Results

```
🎉 All tests passed!
✅ Basic progression: 100kg×8 → 110kg = 5 reps
✅ Same weight: 80kg×10 → 80kg = 9 reps (76.4% of 1RM)
✅ Lighter deload: 100kg×8 → 60kg = 20 reps (capped)
✅ Single rep max: 150kg×1 → 140kg = 4 reps
✅ High reps: 40kg×20 → 45kg = 13 reps
✅ Slight increase: 50kg×12 → 52kg = 10 reps
✅ Major decrease: 120kg×5 → 80kg = 20 reps (capped)
```

## Edge Cases Handled

- Invalid inputs (zero, negative, NaN) → return 1 rep
- Reps > 36 → skip Brzycki formula to avoid division issues
- Very light weights → capped at 20 reps
- Exact percentage matches → return exact table entry
- Percentages below 60% → clamped to 60% (20 reps max)

## Usage

### Backend Endpoint

```bash
POST /auth/suggest-reps
Content-Type: application/json
Authorization: Bearer <token>

{
  "lastWeight": 100,
  "lastReps": 8,
  "newWeight": 110
}

Response:
{
  "suggestedReps": 5,
  "source": "ensemble-1rm-algorithm"
}
```

### Frontend Usage

```typescript
import { getSuggestedReps, estimate1RM } from "@/utils/repAdjustmentUtils";

// Get suggested reps
const suggested = getSuggestedReps(100, 8, 110);  // Returns: 5

// Get 1RM estimate
const oneRM = estimate1RM(100, 8);  // Returns: ~125.1
```

## Notes

- The algorithm is symmetric across both backend and frontend implementations
- Existing progressive overload logic (rep week-over-week increases) is unaffected
- Display badges can optionally continue using Epley-only (`estimate1RMForDisplay`) for consistency
- The percentage table matches common strength training standards from scientific literature
