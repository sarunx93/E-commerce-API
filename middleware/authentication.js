const CustomError = require("../errors");
const { isTokenValid } = require("../utils");

//check if a user exists
const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token;
  if (!token) {
    throw new CustomError.UnauthenticatedError("Authentication Failed");
  }
  try {
    const { name, userId, role } = isTokenValid({ token });
    req.user = { name, userId, role };
    next();
  } catch (error) {
    throw new CustomError.UnauthenticatedError("Authentication Failed");
  }
};

//check if a person is an admin
const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new CustomError.UnauthorziedError("Unauthorized Account");
    }
    next();
  };
};

module.exports = { authenticateUser, authorizePermissions };
