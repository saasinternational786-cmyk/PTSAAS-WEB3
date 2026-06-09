export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const payload = req.body;

    console.log("Webhook Received:", payload);

    return res.status(200).json({
      success: true,
      message: "Webhook received"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}