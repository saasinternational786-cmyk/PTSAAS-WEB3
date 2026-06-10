import { createClient } from "@supabase/supabase-js";

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

    // TEST SUPABASE CONNECTION
    const test = await supabase
      .from("wallets")
      .select("*")
      .limit(1);

    console.log("SUPABASE TEST:", JSON.stringify(test));

    // SAVE DEPOSIT
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

    console.log("DEPOSIT ERROR:", depositError);

    if (depositError) {
      throw depositError;
    }

    // GET WALLET
    const {
      data: wallet,
      error: walletError
    } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("WALLET ERROR:", walletError);
    console.log("WALLET DATA:", wallet);

    if (walletError) {
      throw walletError;
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found"
      });
    }

    const newBalance =
      Number(wallet.usdt_balance || 0) + Number(amount);

    // UPDATE WALLET
    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        usdt_balance: newBalance
      })
      .eq("user_id", userId);

    console.log("UPDATE ERROR:", updateError);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      credited: amount,
      newBalance
    });

  } catch (err) {
    console.error("FULL ERROR:", JSON.stringify(err, null, 2));
    console.error("MESSAGE:", err.message);
    console.error("DETAILS:", err.details);
    console.error("HINT:", err.hint);
    console.error("CODE:", err.code);

    return res.status(500).json({
      success: false,
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
  }
}