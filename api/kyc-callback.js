export default async function handler(req, res) {

  try {

    const { userId, status } = req.body;

    console.log(
      "KYC CALLBACK",
      userId,
      status
    );

    return res.status(200).json({
      success: true
    });

  } catch (err) {

    return res.status(500).json({
      success: false
    });

  }
}