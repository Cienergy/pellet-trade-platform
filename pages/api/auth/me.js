import requireAuth from "../../../lib/requireAuth";

export default requireAuth(async function handler(req, res) {
  const { user } = req.session;

  res.status(200).json({
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  });
});
