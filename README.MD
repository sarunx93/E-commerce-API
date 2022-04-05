[E-Commerce API Heroku URL](https://my-first-big-api.herokuapp.com/)

#### Project Description
First of all, this is a ExpressJS project from a Node course that I'm taking, but it contains a lot of parts that I consider worthwhile to learn. 
The e-commerce api provides data about retail products that the front-end can consume and display accordingly. Moreover, this api also provides authentication so that only authenticated users can access a certain route. I use MongoDB as the database and Mongoose to manage the schema. Since this is a fairly big project, there are a lot of components working together and understanding all of them is quite challenging. Documentaion is also available so users can learn what each request does and what its body looks like.
In the following sections, I will explain the steps I took when I was working on the project.

#### Technologies used 
- Langauges : JavaScript and HTML
- Packages : Express, Mongoose, jsonwebtoken and more (please see the full list in package.json)
- Deployment : Heroku

#### Routes and Controllers
In this section, I will explain how routes and controllers are realated. Since I don't want this README to be too long, I will only give an example of the user route and user controller. The other routes and controllers apply the same method to bind them together, they are only slightly different.
First and foremost, we need to import and initailize an Express instance and, according to the convention, give it a name of 'app'.
```
const express = require("express");
const app = express();
```
After that, we use app.use method to bind each path to a route.
```
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/orders", orderRouter);
```
And each route is binded to a controller which will be triggered when a request is sent to the server. Here is the code snippet of the user route that is responsible for displaying and updating a user's profile.

```
const express = require("express");
const router = express.Router();
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication");
const {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
} = require("../controllers/userController");
router
  .route("/")
  .get(authenticateUser, authorizePermissions("admin", "owner"), getAllUsers); //only admin and owner have access
router.route("/showMe").get(authenticateUser, showCurrentUser);
router.route("/updateUser").patch(authenticateUser, updateUser);
router.route("/updateUserPassword").patch(authenticateUser, updateUserPassword);
router.route("/:id").get(authenticateUser, getSingleUser);

module.exports = router;
```
As a sidenote, two authentication middlewares is incoprated here to validate if the user sending requrests is authenticated.
And this is how the user controller looks like.
```
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const {
  createTokenUser,
  attachCookiesToResponse,
  checkPermissions,
} = require("../utils");

const getAllUsers = async (req, res) => {
  const users = await User.find({ role: "user" }).select("-password");
  res.status(StatusCodes.OK).json({ users });
};
const getSingleUser = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id }).select("-password");
  if (!user) {
    throw new CustomError.NotFoundError(`No user with id ${req.params.id}`);
  }
  checkPermissions(req.user, user._id);
  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};

//update user using user.save
const updateUser = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw new CustomError.BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ _id: req.user.userId });
  user.email = email;
  user.name = name;
  await user.save(); //Warning : the password will be hashed one more time.
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError("Please provide both values");
  }
  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials");
  }
  user.password = newPassword;
  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated" });
};

module.exports = {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
};
```
Here, the controller will implement CRUD operations (create, read, update and delete) via the User model which is an instance of Mongoose that interacts with the database.(imported in line 1).
If you want to send a request and see the result, please do so in Postman. [click here to download](https://www.postman.com/). This is how the respond looks like when sending a GET request in Postman.
<img src='https://github.com/sarunx93/E-commerce-API/blob/master/images/get_all_users.png'>
And this is how you can send a POST request to register a new user



#### Models (Mongoose Schemas)
This is where we determine how our schemas is going to look like in the database, whether how many properties will we have or what types are they, this will be done here.
```
const mongoose = require("mongoose");
const validator = require("validator");
//password encryption
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name must be provided"],
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email must be provided."],
    //validate emails using external package.
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email",
    },
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});


userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model("Users", userSchema);
```
In this schema, each user has 4 properties: name, email, password and role. All of them can't be empty values but only role has the default value of user. There are 2 extra packages invloved in this model set up: bcrypt and validator. Bcrypt is capable of encrypting passwords before sending it to database which is crucial since we don't want any password to be shown in plain text whereas Validator helps with email validation so that we don't need to write the email validation logic ourselves.
Furthermore, I also created a custom method to compare passwords which will be used in password updating in the user controller. Basically, we just use a compare built-in method in Bcrypt and return a boolean value.


#### JWT and cookies
JSON web token or JWT is a series of string that is used for user authentication. Basically, users who log in or register will receive a token upon transactions and the backend will validate if a user is authenticated using this token. If a user is authenticated, he or she will receive a token and be allowed to access the information inside.

In this project, jwt is attached to cookies which in turn attaced to the response, so that the server can validate if the request sent comes with a valid token.
This how it looks like in the code.
```
const jwt = require("jsonwebtoken");
const createJWT = ({ payload }) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
  return token;
};

const isTokenValid = ({ token }) => jwt.verify(token, process.env.JWT_SECRET);

const attachCookiesToResponse = ({ res, user }) => {
  const token = createJWT({ payload: user });
  const twoDays = 1000 * 60 * 60 * 240;
  //saving jwt in cookies
  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + twoDays),
    secure: process.env.NODE_ENV === "production",
    signed: true,
  });
};

module.exports = {
  createJWT,
  isTokenValid,
  attachCookiesToResponse,
};
```
For a use-case, please see the code snippet below. You will see that a cookie will be attached once the authentications is done and then the response will be sent with a cookie, so that the browser can recognize that this is a valid request.

## Middlewares
There are several middlewares in this projects. All of them help make the application more robust and more understandable.
### 1.authentication.js 
#### 1.1 authenticateUser
- Check if a logged-in user comes with a valid token, if not throw an unauthenticate error.
#### 1.2 authorizePermissions
- If the role of a user is neither user nor admin, simply throw an unauthorized error.

### 2.full-auth.js 
- This is to verify the incoming token that it is valid and not random

### 3.error-handler.js
- A function that handles errors from MongoDB and make it more readable by giving meaningful responses rather than default reponses from the database.

### 4. not-found.js
- This one sends a 404 status with a response message to the user. Since 404 is quite a common response, it makes sense to write it in a function and export it across the appilication.



