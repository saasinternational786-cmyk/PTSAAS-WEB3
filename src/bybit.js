import { RestClientV5 } from "bybit-api";

const client = new RestClientV5({
  key: import.meta.env.VITE_BYBIT_API_KEY,
  secret: import.meta.env.VITE_BYBIT_API_SECRET,
});

export default client;