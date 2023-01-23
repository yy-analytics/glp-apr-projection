import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { Button, CssBaseline, Divider, Link } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { currencyRounded, getGLPStats, percentageFormat } from './utils';

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
              APR projection for GLP pool on Avalanche
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
            <Typography variant="h6">
              From GMX dashboard as of : {glpStats.currentTimestamp || "loading..."}
            </Typography>
            <Divider color="green"/>
            <Typography variant="h6">
              Current GLP Pool TVL = {currencyRounded(glpStats.glpTVL) || "loading..."}
            </Typography>
            <Divider color="green"/>
            <Typography variant="h6">
              Fees in 7 days prior to last reset = {currencyRounded(glpStats.previousFeesSince) || "loading..."}
            </Typography>
            <Typography variant="h6">
              Current APR (based on 70% of fees) = {percentageFormat(glpStats.currentAPR) || "loading..."}
            </Typography>
            <Divider color="green"/>
            <Typography variant="h6">
              Fees since last reset = {currencyRounded(glpStats.feesSince) || "loading..."}
            </Typography>
            <Typography variant="h6">
              Forecasted APR (based on 70% of fees) = {percentageFormat(glpStats.forecastedAPR) || "loading..."}
            </Typography>
          </Grid>
        </Grid>
      </Container >
    </ThemeProvider >
  );
}

export default App;
