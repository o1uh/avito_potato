import axios from 'axios';
import { ENV } from '@/shared/config/env';

export const API_URL = ENV.API_URL;

export const $api = axios.create({
  baseURL: '/api', // Используем прокси Vite
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});