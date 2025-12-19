import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const $api = axios.create({
  baseURL: '/api', // Используем прокси Vite
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});