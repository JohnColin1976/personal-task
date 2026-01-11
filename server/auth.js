import jwt from "jsonwebtoken";

export function signToken(secret) {
  // single-user: payload минимальный
  return jwt.sign({ u: "single" }, secret, { expiresIn: "30d" });
}

export function authMiddleware(secret) {
  return (req, res, next) => {
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ error: "unauthorized" });
    try {
      jwt.verify(token, secret);
      next();
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  };
}
