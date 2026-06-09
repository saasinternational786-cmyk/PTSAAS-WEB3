export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false
    });
  }

  try {

    const { txHash, amount, wallet } = req.body;

    console.log(
      "Settlement:",
      txHash,
      amount,
      wallet
    );

    return res.status(200).json({
      success: true,
      status: "SETTLED"
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
}