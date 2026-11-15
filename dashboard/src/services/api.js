// API service for fetching gateway metrics

import axios from 'axios';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

// Fetch all metrics from gateway
export async function fetchMetrics() {
  try {
    const response = await axios.get(`${GATEWAY_URL}/metrics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

// Fetch health status
export async function fetchHealth() {
  try {
    const response = await axios.get(`${GATEWAY_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Error fetching health:', error);
    throw error;
  }
}

// Fetch metrics for specific route
export async function fetchRouteMetrics(route) {
  try {
    const encodedRoute = encodeURIComponent(route.replace(/^\//, ''));
    const response = await axios.get(`${GATEWAY_URL}/metrics/${encodedRoute}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching metrics for route ${route}:`, error);
    throw error;
  }
}

// Fetch system resource metrics (CPU, memory, disk)
export async function fetchSystemMetrics() {
  try {
    const response = await axios.get(`${GATEWAY_URL}/metrics/system`);
    return response.data;
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    throw error;
  }
}

// Fetch recent structured log entries
export async function fetchLogs(limit = 200) {
  try {
    const response = await axios.get(`${GATEWAY_URL}/metrics/logs?limit=${limit}`);
    return response.data.logs || [];
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
}
