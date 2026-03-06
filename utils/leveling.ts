import { Session, UserProfile } from '../types';

/**
 * Calculates the current study streak based on daily duration goals.
 * Dates are standardized to local midnight to avoid timezone shift issues.
 */
export function calculateStreak(sessions: Session[], streakGoalHours: number): { currentStreak: number, maxStreak: number } {
    const dailyDurations: Record<string, number> = {};

    sessions.forEach(s => {
        if (!s.duration) return;
        const d = new Date(s.timestamp);
        d.setHours(0, 0, 0, 0);
        const dateKey = d.getTime().toString();
        dailyDurations[dateKey] = (dailyDurations[dateKey] || 0) + s.duration; // duration in seconds
    });

    const streakGoalSeconds = Math.max(0.1, streakGoalHours) * 3600; // Prevent 0 goal issues

    const validDates = Object.entries(dailyDurations)
        .filter(([_, seconds]) => seconds >= streakGoalSeconds)
        .map(([ts]) => parseInt(ts))
        .sort((a, b) => b - a); // Descending order

    let currentStreak = 0;
    let maxStreak = 0;

    if (validDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const yesterdayTime = todayTime - 86400000;

        // Current Streak Calculation
        if (validDates[0] === todayTime || validDates[0] === yesterdayTime) {
            currentStreak = 1;
            for (let i = 0; i < validDates.length - 1; i++) {
                const diff = validDates[i] - validDates[i + 1];
                if (diff >= 86400000 - 3600000 && diff <= 86400000 + 3600000) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Max Streak Calculation
        let tempMax = 1;
        for (let i = 0; i < validDates.length - 1; i++) {
            const diff = validDates[i] - validDates[i + 1];
            if (diff >= 86400000 - 3600000 && diff <= 86400000 + 3600000) {
                tempMax++;
                if (tempMax > maxStreak) maxStreak = tempMax;
            } else {
                if (tempMax > maxStreak) maxStreak = tempMax;
                tempMax = 1;
            }
        }
        if (tempMax > maxStreak) maxStreak = tempMax; // Catch trailing
        if (validDates.length === 1 && maxStreak === 0) maxStreak = 1;
    }

    return { currentStreak, maxStreak };
}

/**
 * Calculates Level from Total XP.
 * Elite formula: Level = floor(0.0245 * XP^0.7) + 1
 * Targets (with 3x multiplier):
 * - Legend (Level 51): ~60 Hours
 * - Diamond (Level 41): ~42 Hours (6h/day)
 * - Platinum (Level 31): ~28 Hours (4h/day)
 */
export function getLevelFromXP(xp: number): number {
    if (xp < 0) return 1;
    return Math.floor(0.0245 * Math.pow(xp, 0.7)) + 1;
}

/**
 * Calculates XP to next level for progress bar.
 */
export function getXPProgress(currentXp: number): { currentLevelXp: number, nextLevelXp: number, progressPercent: number } {
    const currentLevel = getLevelFromXP(currentXp);
    const nextLevel = currentLevel + 1;

    // Inverse function of Level = floor(0.0245 * XP^0.7) + 1
    // XP_for_level = ((Level - 1) / 0.0245) ^ (1 / 0.7)
    const currentLevelStartXp = currentLevel <= 1 ? 0 : Math.floor(Math.pow((currentLevel - 1) / 0.0245, 1 / 0.7));
    const nextLevelStartXp = Math.floor(Math.pow((nextLevel - 1) / 0.0245, 1 / 0.7));

    const xpIntoCurrentLevel = currentXp - currentLevelStartXp;
    const xpNeededForNext = nextLevelStartXp - currentLevelStartXp;

    const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpNeededForNext) * 100));

    return {
        currentLevelXp: currentLevelStartXp,
        nextLevelXp: nextLevelStartXp,
        progressPercent
    };
}

/**
 * Returns the current ISO-8601 week number string (e.g., "2024-W05").
 * Used to track when a user's XP should be reset.
 */
export function getCurrentISOWeek(): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    // Ensure 2-digit pad
    const weekStr = weekNumber.toString().padStart(2, '0');
    return `${date.getFullYear()}-W${weekStr}`;
}

/**
 * Calculate XP earned for a completed session.
 * 5 XP per minute (Duration is in seconds, so duration / 60 * 5).
 * Streak Multiplier: +0.5x per day, up to 3x on day 5.
 */
export function calculateEarnedXP(durationSeconds: number, currentStreak: number): number {
    const baseXP = (durationSeconds / 60) * 5;

    // Multiplier: Day 1: 1.0x, Day 2: 1.5x, Day 3: 2.0x, Day 4: 2.5x, Day 5+: 3.0x
    let multiplier = 1.0;
    if (currentStreak > 1) {
        multiplier = Math.min(3.0, 1.0 + ((currentStreak - 1) * 0.5));
    }

    // Using Math.round to keep XP as integers
    return Math.round(baseXP * multiplier);
}

/**
 * Returns detailed rank visual information based on the 50-level cap system.
 */
export function getRankDetails(level: number) {
    const subTiers = ['I', 'II', 'III', 'IV', 'V'];

    // Level 51+ is Legend
    if (level > 50) {
        return {
            tier: 'Legend',
            subTier: '',
            iconType: 'Sparkles',
            color: 'text-fuchsia-300 drop-shadow-[0_0_25px_rgba(217,70,239,1)]',
            bg: 'bg-gradient-to-tr from-fuchsia-500/40 via-purple-500/30 to-indigo-500/40',
            border: 'border-fuchsia-400 shadow-[0_0_30px_rgba(217,70,239,0.8)]'
        };
    }

    // Calculate major tier (0 to 4)
    const majorTierIndex = Math.floor((level - 1) / 10);
    // Calculate sub tier (0 to 4) - 2 levels per sub tier
    const subTierIndex = Math.floor(((level - 1) % 10) / 2);

    const subTier = subTiers[subTierIndex];

    switch (majorTierIndex) {
        case 0: // 1-10
            return {
                tier: 'Bronze',
                subTier: subTier,
                iconType: 'Target',
                color: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]',
                bg: 'bg-orange-900/40',
                border: 'border-orange-600/50'
            };
        case 1: // 11-20
            return {
                tier: 'Silver',
                subTier: subTier,
                iconType: 'Star',
                color: 'text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]',
                bg: 'bg-slate-700/30',
                border: 'border-slate-400/50'
            };
        case 2: // 21-30
            return {
                tier: 'Gold',
                subTier: subTier,
                iconType: 'Flame',
                color: 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]',
                bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
                border: 'border-yellow-500'
            };
        case 3: // 31-40
            return {
                tier: 'Platinum',
                subTier: subTier,
                iconType: 'Trophy',
                color: 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]',
                bg: 'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent',
                border: 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
            };
        case 4: // 41-50
            return {
                tier: 'Diamond',
                subTier: subTier,
                iconType: 'Crown',
                color: 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,1)]',
                bg: 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30',
                border: 'border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.6)]' // Animation handled in React component
            };
        default:
            return { // Fallback, shouldn't reach here
                tier: 'Bronze',
                subTier: 'I',
                iconType: 'Target',
                color: 'text-orange-400',
                bg: 'bg-orange-800/50',
                border: 'border-orange-500'
            };
    }
}
