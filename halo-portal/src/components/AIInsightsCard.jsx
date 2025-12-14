import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import aiService from '../services/aiService';

const AIInsightsCard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AIInsightsCard mounted');
    fetchAIDashboard();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAIDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAIDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching AI dashboard data...');
      const response = await aiService.getDashboardData();
      console.log('AI dashboard response:', response);
      if (response.success) {
        setDashboardData(response.dashboard);
        console.log('AI dashboard data set successfully');
      } else {
        setError('Failed to load data');
        console.error('AI dashboard response not successful:', response);
      }
    } catch (err) {
      setError(err.message || 'Unknown error');
      console.error('Error fetching AI dashboard:', err);
      console.error('Error details:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex items-center justify-center min-h-[200px]">
        <div className="text-center text-muted-foreground">
          <Brain size={32} className="mx-auto mb-2 opacity-50" />
          <p>Loading AI Insights...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="text-center text-destructive">
          <AlertTriangle size={32} className="mx-auto mb-2" />
          <p className="my-2">Unable to load AI insights</p>
          <p className="text-xs text-muted-foreground my-1">{error}</p>
          <button 
            onClick={fetchAIDashboard}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground border-none rounded-md cursor-pointer text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview, next6Hours, next24Hours } = dashboardData || {};

  const getDelayColor = (probability) => {
    if (probability >= 70) return 'bg-danger-500';
    if (probability >= 40) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground m-0">
              AI Flight Insights
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-0">
              Powered by HALO AI Prediction Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success-50 dark:bg-success-950 rounded-full border border-success-200 dark:border-success-800">
          <Zap size={14} className="text-success-600 dark:text-success-500" />
          <span className="text-xs text-success-600 dark:text-success-500 font-medium">Live</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Next 6 Hours */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Next 6 Hours
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {overview?.totalFlightsNext6h || 0}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {overview?.highRiskNext6h || 0} high risk
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getDelayColor(overview?.avgDelayProbability6h || 0)} transition-all duration-300`}
              style={{ width: `${overview?.avgDelayProbability6h || 0}%` }}
            />
          </div>
        </div>

        {/* Next 24 Hours */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Next 24 Hours
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {overview?.totalFlightsNext24h || 0}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {overview?.highRiskNext24h || 0} high risk
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getDelayColor(overview?.avgDelayProbability24h || 0)} transition-all duration-300`}
              style={{ width: `${overview?.avgDelayProbability24h || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="p-4 bg-warning-50 dark:bg-warning-950 rounded-lg border border-warning-200 dark:border-warning-800">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-warning-600 dark:text-warning-500" />
          <span className="text-sm font-semibold text-warning-700 dark:text-warning-400">
            Requires Attention
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold text-warning-700 dark:text-warning-400">
              {(next6Hours?.requiresAttention || 0) + (next24Hours?.requiresAttention || 0)}
            </div>
            <div className="text-xs text-warning-600 dark:text-warning-500 mt-1">
              flights need monitoring
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-danger-600 dark:text-danger-500">
                {(overview?.highRiskNext6h || 0) + (overview?.highRiskNext24h || 0)}
              </div>
              <div className="text-[10px] text-warning-600 dark:text-warning-500 mt-0.5">
                High Risk
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-warning-600 dark:text-warning-500">
                {(overview?.mediumRiskNext6h || 0) + (overview?.mediumRiskNext24h || 0)}
              </div>
              <div className="text-[10px] text-warning-600 dark:text-warning-500 mt-0.5">
                Medium Risk
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-200 dark:border-primary-800">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-primary-600 dark:text-primary-400" />
          <span className="text-xs text-primary-700 dark:text-primary-300">
            AI predictions update every 10 minutes with real-time flight data
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;

