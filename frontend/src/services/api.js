import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

export const getDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data.data;
};

export default api;
