const express = require("express");
const router = express.Router();

// import validators
const {
  userRegisterValidator,
  userLoginValidator,
  // forgotPasswordValidator,
  // resetPasswordValidator,
} = require("../validators/auth");
const { runValidation } = require("../validators");

// import from controllers
const {
  register,
  // registerActivate,
  login,
  userFromToken,
  requireSignIn,
  // forgotPassword,
  // resetPassword,
  createToken,
  deleteTokens,
  //passwordCheck,
  updateUser,
} = require("../controllers/auth");

router.post("/v1/register", userRegisterValidator, runValidation, register);
// router.post("/register/activate", registerActivate);
router.post("/v1/login", userLoginValidator, runValidation, login);
router.get("/v1/user-auth", requireSignIn, userFromToken);
router.post("/v1/google-tokens", requireSignIn, createToken);
router.delete("/v1/google-tokens/:id", requireSignIn, deleteTokens);
//router.post("/v1/password-confirmation", requireSignIn, passwordCheck);
router.put("/v1/user-info", requireSignIn, updateUser);

// router.put(
//   "/forgot-password",
//   forgotPasswordValidator,
//   runValidation,
//   forgotPassword
// );
// router.put(
//   "/reset-password",
//   resetPasswordValidator,
//   runValidation,
//   resetPassword
// );

// router.get('/secret', requireSignIn, (req, res) => {
//     res.json({
//         data: 'This is secret page for logged in users only'
//     });
// });

module.exports = router;
