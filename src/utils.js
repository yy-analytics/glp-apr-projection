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
    const twoWednesdaysAgo = mostRecentWednesday - 86400 * 7;
    // Get the fees since most recent Wednesday.
    const feesAndTimestamps = feeStats.filter(({ timestamp }) => timestamp >= twoWednesdaysAgo).map(
        ({ timestamp, burn, marginAndLiquidation, mint, swap }) => {
            const summedFees = [burn, marginAndLiquidation, mint, swap].map(
                fee => convertWithDecimals(fee, 30)
            ).reduce((a, b) => a + b, 0);
            return { timestamp, summedFees };
        }
    );
    const feesSince = feesAndTimestamps.filter(({ timestamp }) => timestamp >= mostRecentWednesday).reduce((res, row) => res + row.summedFees, 0);
    const previousFeesSince = feesAndTimestamps.filter(({ timestamp }) => timestamp < mostRecentWednesday).reduce((res, row) => res + row.summedFees, 0);
    // To calculate the APR, we make use of the fact that 70% of the previous week's fees go towards the rewards.
    const currentAPR = 0.7 * previousFeesSince * 365 / (7 * glpTVL);
    const forecastedAPR = 0.7 * feesSince * 86400 * 365 / ((currentTimestamp - mostRecentWednesday) * glpTVL);
    return { currentTimestamp: new Date(currentTimestamp * 1000).toLocaleString(), lastReset: new Date(mostRecentWednesday * 1000).toUTCString(), glpTVL, feesSince, previousFeesSince, currentAPR, forecastedAPR };
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