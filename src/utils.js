import { createClient, gql } from '@urql/core';
import { GLP_STATS_QUERY } from './queries';

const convertWithDecimals = (numberString, decimals) => {
    if (decimals && numberString) {
        return Number(numberString.padStart(decimals + 1, '0').replace(RegExp(`(\\d+)(\\d{${decimals}})`), '$1.$2'));
    };
    return undefined;
};

const WEDNESDAY = 1674000000;  // Any given Wednesday at mignight, which is when the rewards reset.

export const getGLPStats = async () => {
    const client = createClient({
        url: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats',
    });

    let result;
    result = await client.query(gql(GLP_STATS_QUERY)).toPromise();
    // if (!result["data"]) {
    //     console.log(result);
    //     return result;
    // }
    result = result["data"];
    const { feeStats, glpStats } = result;
    const glpTVL = convertWithDecimals(glpStats[0].aumInUsdg, 18);
    // Now we get the relevant timestamps.
    const currentTimestamp = Number((new Date().getTime() / 1000).toFixed(0));
    const mostRecentWednesday = currentTimestamp - ((currentTimestamp - WEDNESDAY) % (86400 * 7));
    const elevenWednesdaysAgo = mostRecentWednesday - 86400 * 70;
    // Get the fees since most recent Wednesday.
    const feesAndTimestamps = feeStats.filter(({ timestamp }) => timestamp >= elevenWednesdaysAgo).map(
        ({ timestamp, burn, marginAndLiquidation, mint, swap }) => {
            const summedFees = [burn, marginAndLiquidation, mint, swap].map(
                fee => convertWithDecimals(fee, 30)
            ).reduce((a, b) => a + b, 0);
            return { timestamp, summedFees, dayOfWeek: (((timestamp - elevenWednesdaysAgo) / 86400) % 7) + 1, weekNumber: Math.floor((timestamp - elevenWednesdaysAgo) / (7 * 86400)) + 1 };
        }
    );
    const feesSince = feesAndTimestamps.filter(({ weekNumber }) => weekNumber === 11).reduce((res, row) => res + row.summedFees, 0);
    const previousFeesSince = feesAndTimestamps.filter(({ weekNumber }) => weekNumber === 10).reduce((res, row) => res + row.summedFees, 0);
    const weeklyTotals = feesAndTimestamps.filter(({ weekNumber }) => weekNumber < 11).reduce(
        (result, row) => {
            if (!result[row.weekNumber]) {
                result[row.weekNumber] = 0;
            };
            result[row.weekNumber] += row.summedFees;
            return result;
        }, {}
    );
    const weeklyFeePercentages = feesAndTimestamps.filter(({ weekNumber }) => weekNumber < 11).map(
        ft => (
            {
                ...ft,
                percentageOfWeek: ft.summedFees / weeklyTotals[ft.weekNumber]
            }
        )
    );
    // Don't want any weeks that have an anomalous day in them (>50% of the fees on one day).
    const excludeWeeks = [...new Set(weeklyFeePercentages.filter(({ percentageOfWeek }) => percentageOfWeek > 0.5).map(obj => obj.weekNumber))];
    // Now can calculate our averages for each day of the week.
    const dailyPercentageAverages = weeklyFeePercentages.filter(({ weekNumber }) => !excludeWeeks.includes(weekNumber)).reduce(
        (res, row) => {
            if (!res[row.dayOfWeek]) {
                res[row.dayOfWeek] = 0;
            };
            res[row.dayOfWeek] += row.percentageOfWeek / (10 - excludeWeeks.length);
            return res;
        }, {}
    );
    // We get our currentWeekFeesAndTimestamps that we will use our dailyPercentageAverages on.
    const currentWeekFeesAndTimestamps = feesAndTimestamps.filter(({ weekNumber }) => weekNumber === 11);
    // Basic linear extrapolation for the latest day.
    // But if it's already more than 5x previous average then we don't fully extrapolate.
    // Here we calculate the previous average fee
    const weeklyFeesForAverage = Object.keys(weeklyTotals).filter(key => !excludeWeeks.includes(key)).map(key => weeklyTotals[key]);
    const previousAverageFee = weeklyFeesForAverage.reduce((a, b) => a + b, 0) / (7 * weeklyFeesForAverage.length);
    // And now we forecast for the rest of the current day.
    let forecastedCurrentWeekFeesAndTimestamps = currentWeekFeesAndTimestamps.map(
        ft => ({ ...ft, summedFees: currentTimestamp - ft.timestamp >= 86400 ? ft.summedFees : (ft.summedFees > 5 * previousAverageFee ? ft.summedFees + previousAverageFee * 7 * dailyPercentageAverages[ft.dayOfWeek] * (1 - (currentTimestamp % 86400) / 86400) : ft.summedFees * (86400 / (currentTimestamp % 86400))) })
    );
    // For the other remaining days, we do something a little more complicated.
    // First we filter out any days which are 5 times bigger than the second biggest day (i.e. one-off big spike days) as they will mess up the forecast.
    // Then, from those remaining, we sum their fees, and used our dailyPercentageAverages to calculate how much we expect to be remaining for the rest of the week.
    // In the case that it's the first day of the week, we use the previous weekly average (excluding anomaly weeks) divided by 7 (so that it's daily) as the "second biggest".
    const secondBiggestFee = forecastedCurrentWeekFeesAndTimestamps.map(ft => ft.summedFees).sort((a, b) => b - a)[1] || previousAverageFee;
    const aggregationsForForecast = forecastedCurrentWeekFeesAndTimestamps.filter(({ summedFees }) => !(summedFees > 5 * secondBiggestFee)).reduce(
        (res, row) => {
            res.summedFees += row.summedFees;
            res.summedPercentages += dailyPercentageAverages[row.dayOfWeek];
            return res;
        }, { summedFees: 0, summedPercentages: 0 }
    );
    const feePerPercentage = (aggregationsForForecast.summedFees || previousAverageFee * 7) / (aggregationsForForecast.summedPercentages || 1);
    forecastedCurrentWeekFeesAndTimestamps = [1, 2, 3, 4, 5, 6, 7].map(day => {
        const currentInfo = forecastedCurrentWeekFeesAndTimestamps.find(ft => ft.dayOfWeek === day);
        if (currentInfo) {
            return currentInfo;
        } else {
            return ({
                timestamp: mostRecentWednesday + 86400 * (day - 1),
                summedFees: feePerPercentage * dailyPercentageAverages[day],
                dayOfWeek: day,
                weekNumber: 11
            });
        };
    });
    const feesChart = forecastedCurrentWeekFeesAndTimestamps.map(({ timestamp, summedFees }) => (
        {
            timestamp: timestamp,
            actual: currentWeekFeesAndTimestamps.find(ft => ft.timestamp === timestamp)?.summedFees || 0,
            forecast: summedFees - (currentWeekFeesAndTimestamps.find(ft => ft.timestamp === timestamp)?.summedFees || 0)
        }
    ));
    const weightingChart = ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday"].map((day, num) => (
        {
            day,
            "% of fees": dailyPercentageAverages[num + 1]
        }
    ));
    // To calculate the APR, we make use of the fact that 70% of the previous week's fees go towards the rewards.
    const currentAPR = 0.7 * previousFeesSince * 365 / (7 * glpTVL);
    const forecastedAPR = 0.7 * feesSince * 86400 * 365 / ((currentTimestamp - mostRecentWednesday) * glpTVL);
    const altForecastedAPR = 0.7 * forecastedCurrentWeekFeesAndTimestamps.reduce((res, row) => res + row.summedFees, 0) * 365 / (7 * glpTVL);
    return (
        {
            currentTimestamp: new Date(currentTimestamp * 1000).toLocaleString(),
            lastReset: new Date(mostRecentWednesday * 1000).toUTCString(),
            glpTVL,
            feesSince,
            previousFeesSince,
            currentAPR,
            forecastedAPR,
            altForecastedAPR,
            feesChart,
            weightingChart,
        }
    );
};

export const currencyRounded = (v, delta = false) => {
    if (v == null) {
        return v;
    };
    const posPrefix = (delta ? '+' : '');
    return `${Math.sign(v) >= 0 ? posPrefix : '-'}$` + absNumberRounded(v);
};

const absNumberRounded = (n) => {
    if (n == null) {
        return n;
    };
    const v = Math.abs(n);
    if (v >= 1e12) {
        return `${v.toExponential(2)}`;
    } else if (v >= 1e10) {
        return `${Math.round(v / 1e9)}B`;
    } else if (v >= 1e9) {
        return `${(v / 1e9).toFixed(2)}B`;
    } else if (v >= 1e7) {
        return `${Math.round(v / 1e6)}M`;
    } else if (v >= 1e6) {
        return `${(v / 1e6).toFixed(1)}M`;
    } else if (v >= 1e4) {
        return `${Math.round(v / 1e3)}K`;
    } else if (v >= 1e3) {
        return `${(v / 1e3).toFixed(1)}K`;
    } else if (v >= 1e2) {
        return `${Math.round(v)}`;
    } else if (v >= 0.01) {
        return `${v.toFixed(2)}`;
    } else if (v === 0) {
        return `${Math.round(v)}`;
    } else {
        return `<0.01`;
    }
};

export const percentageFormat = (v, delta = false) => (delta && v >= 0 ? '+' : '') + (v >= 100 ? `${(100 * v).toExponential(1)}%` : (v >= 1 ? `${Math.round(100 * v)}%` : `${(100 * v).toFixed(2)}%`));