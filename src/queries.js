export const GLP_STATS_QUERY = `
query {
    glpStats(first: 1, orderBy: timestamp, orderDirection: desc) {
        id
        period
        timestamp
        aumInUsdg
    }
    feeStats(first: 77, orderBy: timestamp, orderDirection: desc) {
        swap
        marginAndLiquidation
        mint
        burn
        timestamp
    }
}
`