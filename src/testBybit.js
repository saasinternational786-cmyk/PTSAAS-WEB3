import client from "./bybit";

export const testBybit = async () => {
  try {
    const result = await client.getServerTime();

    console.log("BYBIT RESPONSE:", result);

    alert("Bybit Connected Successfully");
  } catch (error) {
    console.error("BYBIT ERROR:", error);

    console.log("MESSAGE:", error.message);
    console.log("NAME:", error.name);
    console.log("FULL:", error);

    alert(error.message || "Unknown Error");
  }
};