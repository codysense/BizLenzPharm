import jwt from "jsonwebtoken";

const METABASE_URL = "http://localhost:3002";
const METABASE_SECRET = process.env.METABASE_SECRET;

export const getDashboardEmbed = (req, res) => {
  const payload = {
    resource: { dashboard: 1 },
    params: {},
    exp: Math.floor(Date.now() / 1000) + 600
  };

  const token = jwt.sign(payload, METABASE_SECRET);

  res.json({
    url: `${METABASE_URL}/embed/dashboard/${token}#bordered=true&titled=true`
  });
};
