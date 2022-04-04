const CustomError = require("../errors");
const checkPermissions = (requestUser, resourceUserId) => {
  // console.log(requestUser);
  // console.log(typeof requestUser);
  // console.log(resourceUserId);
  // console.log(typeof resourceUserId);
  if (requestUser.role === "admin") return;
  if (requestUser.userId === resourceUserId.toString()) return;
  throw new CustomError.UnauthorziedError("Not Authorized");
};
module.exports = checkPermissions;
