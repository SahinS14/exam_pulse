const accessCheck = (req, res, next) => {
  if (!req.user.isPaid) {
    return res.status(403).json({ message: "Access not purchased" });
  }

  if (!req.user.accessExpiry || new Date(req.user.accessExpiry) < new Date()) {
    return res.status(403).json({ message: "Access expired" });
  }

  next();
};

module.exports = accessCheck;
