import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { Button, CssBaseline, Divider, Link } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { currencyRounded, getGLPStats, percentageFormat } from './utils';

const InfoLine = (props) => {
  return (
    <Grid container>
      <Grid item xs={8} sm={7} md={5} lg={4} xl={3}>
        <Typography variant="h6">
          {props.label}
        </Typography>
      </Grid>
      <Grid item xs={4} sm={5} md={7} lg={8} xl={9}>
        <Typography variant="h6" color={props.color}>
          {props.value}
        </Typography>
      </Grid>
    </Grid>
  )
};

function App() {
  const [glpStats, setGLPStats] = React.useState({});

  React.useEffect(() => {
    handleRefreshStats();
  }, []);

  const handleRefreshStats = async () => {
    setGLPStats({});
    const newGLPStats = await getGLPStats();
    setGLPStats(newGLPStats);
  };

  const timestampToDate = timestamp => new Date(1000 * timestamp).toISOString().slice(0, 10);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{
        height: '100vh',
        padding: "10px",
      }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h3">
              GLP Rewards Forecaster
            </Typography>
            <Typography variant="caption">
              A <Link href="https://yieldyak.com/">Yield Yak</Link> community product
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleRefreshStats}>
              Refresh
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2">
              Last updated: {glpStats.currentTimestamp || "loading..."}
            </Typography>
            <Typography variant="body2">
              Last rewards reset: {glpStats.lastReset || "loading..."}
            </Typography>
            <Divider color="green" />
            <InfoLine label="Current GLP Pool TVL" value={currencyRounded(glpStats.glpTVL) || "loading..."} />
            <Divider color="green" />
            <InfoLine label="Fees in 7 days prior to last reset" value={currencyRounded(glpStats.previousFeesSince) || "loading..."} />
            <InfoLine label="Current APR" value={percentageFormat(glpStats.currentAPR) || "loading..."} />
            <Divider color="green" />
            <InfoLine label="Fees since last reset" value={currencyRounded(glpStats.feesSince) || "loading..."} />
            <InfoLine color="primary" label="Forecasted APR (basic)" value={percentageFormat(glpStats.forecastedAPR) || "loading..."} />
            <InfoLine color="primary" label="Forecasted APR (weighted)" value={percentageFormat(glpStats.altForecastedAPR) || "loading..."} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption">
              * All stats shown are for GLP on the Avalanche network
            </Typography>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Typography variant="h6">
              Average spread of fees over the last 10 weeks (anomalies excluded)
            </Typography>
            <BarChart
              width={600}
              height={300}
              data={glpStats.weightingChart}
              margin={{ top: 10, right: 40, left: 5, bottom: 5 }}
            >
              <XAxis dataKey="day" interval={0} style={{ fontSize: "0.8rem" }} />
              <YAxis tickFormatter={v => percentageFormat(v)}/>
              <Tooltip formatter={v => percentageFormat(v)} contentStyle={{ backgroundColor: theme.palette.background.default, opacity: 0.75 }} labelStyle={{ color: theme.palette.text.main }}/>
              <Legend />
              <Bar dataKey="% of fees" fill={theme.palette.primary.main} />
            </BarChart>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Typography variant="h6">
              Forecasted fees (weighted) for the rest of this week
            </Typography>
            <BarChart
              width={600}
              height={300}
              data={glpStats.feesChart}
              margin={{ top: 10, right: 40, left: 5, bottom: 5 }}
            >
              <XAxis dataKey="timestamp" interval={0} tickFormatter={timestampToDate} style={{ fontSize: "0.8rem" }} />
              <YAxis tickFormatter={v => currencyRounded(v)}/>
              <Tooltip formatter={v => currencyRounded(v)} labelFormatter={timestampToDate} contentStyle={{ backgroundColor: theme.palette.background.default, opacity: 0.75 }} labelStyle={{ color: theme.palette.text.main }}/>
              <Legend />
              <Bar dataKey="actual" stackId="a" fill={theme.palette.primary.main} />
              <Bar dataKey="forecast" stackId="a" fill={theme.palette.info.main} />
            </BarChart>
          </Grid>
        </Grid>
      </Container >
    </ThemeProvider >
  );
}

export default App;
