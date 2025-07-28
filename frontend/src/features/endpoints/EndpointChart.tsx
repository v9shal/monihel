import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type Point,
  type BubbleDataPoint,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { type Endpoint, type EndpointMetric, PingStatus } from '../../types';
import apiClient from '../../lib/axios';
 ChartJS<'line', (number | Point | BubbleDataPoint | null)[], unknown>;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EndpointChartProps {
  endpoint: Endpoint;
  timeRange?: '1h' | '6h' | '24h';
}

interface ChartDataPoint {
  timestamp: string;
  responseTime: number;
  status: PingStatus;
}

export const EndpointChart: React.FC<EndpointChartProps> = ({ 
  endpoint, 
  timeRange = '1h' 
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRange);
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);

  const fetchMetrics = async (range: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get<EndpointMetric[]>(
        `/endpoint/${endpoint.id}/metrics?range=${range}&limit=100`
      );
      
      const data = response.data.map(metric => ({
        timestamp: metric.timestamp,
        responseTime: metric.responseTimeMs,
        status: metric.status
      }));
      
      setChartData(data.reverse()); 
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(selectedRange);
  }, [endpoint.id, selectedRange]);

  useEffect(() => {
    if (endpoint.latestTimestamp && endpoint.latestResponseTime && endpoint.latestStatus) {
      const newDataPoint: ChartDataPoint = {
        timestamp: endpoint.latestTimestamp,
        responseTime: endpoint.latestResponseTime,
        status: endpoint.latestStatus
      };

      setChartData(prevData => {
        const exists = prevData.some(point => point.timestamp === newDataPoint.timestamp);
        if (exists) return prevData;

        const updatedData = [...prevData, newDataPoint];
        return updatedData.slice(-100);
      });
    }
  }, [endpoint.latestTimestamp, endpoint.latestResponseTime, endpoint.latestStatus]);

  const prepareChartData = () => {
    const labels = chartData.map(point => 
      new Date(point.timestamp).toLocaleTimeString()
    );

    const responseTimeData = chartData.map(point => point.responseTime);
    
    const backgroundColors = chartData.map(point => {
      switch (point.status) {
        case PingStatus.UP: return 'rgba(34, 197, 94, 0.1)';
        case PingStatus.DOWN: return 'rgba(239, 68, 68, 0.1)';
        case PingStatus.TIMEOUT: return 'rgba(251, 191, 36, 0.1)';
        default: return 'rgba(156, 163, 175, 0.1)';
      }
    });

    const borderColors = chartData.map(point => {
      switch (point.status) {
        case PingStatus.UP: return 'rgba(34, 197, 94, 1)';
        case PingStatus.DOWN: return 'rgba(239, 68, 68, 1)';
        case PingStatus.TIMEOUT: return 'rgba(251, 191, 36, 1)';
        default: return 'rgba(156, 163, 175, 1)';
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (ms)',
          data: responseTimeData,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: backgroundColors,
          pointBackgroundColor: borderColors,
          pointBorderColor: borderColors,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
          fill: false,
        },
      ],
    };
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
      title: {
        display: true,
        text: `${endpoint.name} - Response Time`,
        color: 'rgba(255, 255, 255, 0.9)',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        callbacks: {
          afterLabel: (context) => {
            const dataPoint = chartData[context.dataIndex];
            return `Status: ${dataPoint?.status || 'Unknown'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: (value) => `${value}ms`,
        },
      },
    },
    animation: {
      duration: 750,
    },
  };

  const getAverageResponseTime = () => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, point) => acc + point.responseTime, 0);
    return Math.round(sum / chartData.length);
  };

  const getUptimePercentage = () => {
    if (chartData.length === 0) return 100;
    const upCount = chartData.filter(point => point.status === PingStatus.UP).length;
    return Math.round((upCount / chartData.length) * 100);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          {['1h', '6h', '24h'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range as any)}
              className={`px-3 py-1 text-xs rounded ${
                selectedRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        
        <div className="flex space-x-4 text-xs text-gray-400">
          <span>Avg: {getAverageResponseTime()}ms</span>
          <span>Uptime: {getUptimePercentage()}%</span>
          <span className={`${
            endpoint.latestStatus === PingStatus.UP ? 'text-green-400' : 
            endpoint.latestStatus === PingStatus.DOWN ? 'text-red-400' : 
            'text-yellow-400'
          }`}>
            ● {endpoint.latestStatus || 'Unknown'}
          </span>
        </div>
      </div>

      <div style={{ height: '300px' }}>
        {chartData.length > 0 ? (
          <Line ref={chartRef} data={prepareChartData()} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p>No data available</p>
              <p className="text-sm">Metrics will appear once monitoring begins</p>
            </div>
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          <p>
            Showing {chartData.length} data points from the last {selectedRange}
            {endpoint.latestTimestamp && (
              <span className="ml-2">
                • Last update: {new Date(endpoint.latestTimestamp).toLocaleString()}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};