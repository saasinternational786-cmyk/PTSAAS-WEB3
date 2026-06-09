import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log(
  "SERVICE_ROLE_EXISTS =",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("ENV CHECK");
console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "FOUND" : "MISSING"
);

console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "FOUND" : "MISSING"
);
    res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
  return res.status(200).end();
}
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed"
    });
  }

  try {
    const { userId, txHash, amount, coin } = req.body;
    console.log("BODY:", req.body);
    console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SERVICE_KEY EXISTS =", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Save deposit
    const { error: depositError } = await supabase
      .from("deposits")
      .insert([
        {
          user_id: userId,
          coin: coin,
          amount: amount,
          tx_hash: txHash,
          status: "Approved"
        }
      ]);

    if (depositError) throw depositError;

    // Update wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
.maybeSingle();

    if (walletError || !wallet) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found"
      });
    }

    let newBalance = Number(wallet.usdt_balance || 0) + Number(amount);

    await supabase
      .from("wallets")
      .update({
        usdt_balance: newBalance
      })
      .eq("user_id", userId);

    return res.status(200).json({
      success: true,
      credited: amount
    });

  }catch (err) {
  console.error("FULL ERROR:", err);

  return res.status(500).json({
    success: false,
    error: err.message,
    stack: err.stack
  });
}
}
