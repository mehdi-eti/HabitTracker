/** @format */

import axios from "axios";

const axiosInstance = axios.create({
	baseURL: "http://localhost:8979",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

// Request interceptor
axiosInstance.interceptors.request.use(
	(config) => {
		// You can add auth tokens here if needed
		// const token = localStorage.getItem("token");
		// if (token) {
		//   config.headers.Authorization = `Bearer ${token}`;
		// }
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Handle errors globally
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	},
);

export default axiosInstance;
