const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Not found - ${req.originalUrl}`
  });
};

module.exports = { notFound };
