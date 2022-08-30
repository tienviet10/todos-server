const User = require("../models/user");
const UserPublicInfo = require("../models/users-public-info");
// const Link = require("../models/link");
//const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
var { expressjwt: expressjwt } = require("express-jwt");

const { google } = require("googleapis");
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.CLIENT_URL
);

const Notification = require("../models/notification");

// const {
//   registerEmailParams,
//   forgotPasswordEmailParams,
// } = require("../helpers/email");

// const shortId = require("shortid");
// const _ = require("lodash");

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const ses = new AWS.SES({ apiVersion: "2010-12-01" });

exports.register = (req, res) => {
  // console.log('REGISTER CONTROLLER', req.body);
  const { username, email, password } = req.body;
  // // check if user exists in our db
  // User.findOne({ email }).exec((err, user) => {
  //   if (user) {
  //     return res.status(400).json({
  //       error: "Email is taken",
  //     });
  //   }
  //   // // generate token with user name email and password
  //   // const token = jwt.sign(
  //   //   { name, email, password, categories },
  //   //   process.env.JWT_ACCOUNT_ACTIVATION,
  //   //   {
  //   //     expiresIn: "10m",
  //   //   }
  //   // );

  //   // // send email
  //   // const params = registerEmailParams(email, token);

  //   //const sendEmailOnRegister = ses.sendEmail(params).promise();

  //   // sendEmailOnRegister
  //   //   .then((data) => {
  //   //     console.log("email submitted to SES", data);
  //   //     res.json({
  //   //       message: `Email has been sent to ${email}, Follow the instructions to complete your registration`,
  //   //     });
  //   //   })
  //   //   .catch((error) => {
  //   //     console.log("ses email on register", error);
  //   //     res.json({
  //   //       message: `We could not verify your email. Please try again`,
  //   //     });
  //   //   });
  // });

  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return res.status(401).json({
        error: "Email is taken",
      });
    }

    // register new user
    const newUser = new User({
      username,
      // name,
      email,
      password,
      // categories,
    });
    newUser.save((err, result) => {
      if (err) {
        return res.status(401).json({
          error:
            "Error saving your information to the database. Please try again!",
        });
      }

      //Create another user public information for searching in "users-public-info" folder
      // register new user
      const newUserPublicInfo = new UserPublicInfo({
        username,
        email,
        picture: "",
      });

      newUserPublicInfo.save((err, result) => {
        if (err) {
          return res.status(401).json({
            error:
              "Error saving user public information to the database. Try again later!",
          });
        }

        return res.json({
          message: "Registration success. Please login.",
        });
      });
    });
  });
};

// exports.registerActivate = (req, res) => {
//   const { token } = req.body;
//   // console.log(token);
//   jwt.verify(
//     token,
//     process.env.JWT_ACCOUNT_ACTIVATION,
//     function (err, decoded) {
//       if (err) {
//         return res.status(401).json({
//           error: "Expired link. Try again",
//         });
//       }

//       const { name, email, password, categories } = jwt.decode(token);
//       const username = shortId.generate();

//       User.findOne({ email }).exec((err, user) => {
//         if (user) {
//           return res.status(401).json({
//             error: "Email is taken",
//           });
//         }

//         // register new user
//         const newUser = new User({
//           username,
//           name,
//           email,
//           password,
//           // categories,
//         });
//         newUser.save((err, result) => {
//           if (err) {
//             return res.status(401).json({
//               error: "Error saving user in database. Try later",
//             });
//           }
//           return res.json({
//             message: "Registration success. Please login.",
//           });
//         });
//       });
//     }
//   );
// };

exports.login = (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist. Please register!",
      });
    }
    // authenticate to log in
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: "Email and password do not match",
      });
    }
    // generate token that are used for 5 days and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });

    return res.json({
      token,
    });
  });
};

//// To Authenticate user whenever front-end request to open a certain pages that needs authentication
exports.userFromToken = (req, res) => {
  const _id = req.auth._id;

  User.findOne({ _id }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist. Please register.",
      });
    }

    // generate token that are used for 5 days and send to client.
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });
    const { _id, username, email, role, givenName, name, picture } = user;
    const jsonDetailsSendBack = {
      _id,
      username,
      email,
      role,
      givenName,
      name,
      picture,
      refreshToken: user.refreshToken ? 1 : 0,
    };
    return res.json({
      token,
      user: jsonDetailsSendBack,
    });
  });
};

exports.requireSignIn = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
}); // req.user

// exports.authMiddleware = (req, res, next) => {
//   const authUserId = req.user._id;
//   User.findOne({ _id: authUserId }).exec((err, user) => {
//     if (err || !user) {
//       return res.status(400).json({
//         error: "User not found",
//       });
//     }
//     req.profile = user;
//     next();
//   });
// };

// exports.adminMiddleware = (req, res, next) => {
//   const adminUserId = req.user._id;
//   User.findOne({ _id: adminUserId }).exec((err, user) => {
//     if (err || !user) {
//       return res.status(400).json({
//         error: "User not found",
//       });
//     }

//     if (user.role !== "admin") {
//       return res.status(400).json({
//         error: "Admin resource. Access denied",
//       });
//     }

//     req.profile = user;
//     next();
//   });
// };

// exports.forgotPassword = (req, res) => {
//   const { email } = req.body;
//   // check if user exists with that email
//   User.findOne({ email }).exec((err, user) => {
//     if (err || !user) {
//       return res.status(400).json({
//         error: "User with that email does not exist",
//       });
//     }
//     // generate token and email to user
//     const token = jwt.sign(
//       { name: user.name },
//       process.env.JWT_RESET_PASSWORD,
//       { expiresIn: "10m" }
//     );
//     // send email
//     const params = forgotPasswordEmailParams(email, token);

//     // populate the db > user > resetPasswordLink
//     return user.updateOne({ resetPasswordLink: token }, (err, success) => {
//       if (err) {
//         return res.status(400).json({
//           error: "Password reset failed. Try later.",
//         });
//       }
//       const sendEmail = ses.sendEmail(params).promise();
//       sendEmail
//         .then((data) => {
//           console.log("ses reset pw success", data);
//           return res.json({
//             message: `Email has been sent to ${email}. Click on the link to reset your password`,
//           });
//         })
//         .catch((error) => {
//           console.log("ses reset pw failed", error);
//           return res.json({
//             message: `We could not verify your email. Try later.`,
//           });
//         });
//     });
//   });
// };

// exports.resetPassword = (req, res) => {
//   const { resetPasswordLink, newPassword } = req.body;
//   if (resetPasswordLink) {
//     // check for expiry
//     jwt.verify(
//       resetPasswordLink,
//       process.env.JWT_RESET_PASSWORD,
//       (err, success) => {
//         if (err) {
//           return res.status(400).json({
//             error: "Expired Link. Try again.",
//           });
//         }

//         User.findOne({ resetPasswordLink }).exec((err, user) => {
//           if (err || !user) {
//             return res.status(400).json({
//               error: "Invalid token. Try again",
//             });
//           }

//           const updatedFields = {
//             password: newPassword,
//             resetPasswordLink: "",
//           };

//           user = _.extend(user, updatedFields);

//           user.save((err, result) => {
//             if (err) {
//               return res.status(400).json({
//                 error: "Password reset failed. Try again",
//               });
//             }

//             res.json({
//               message: `Great! Now you can login with your new password`,
//             });
//           });
//         });
//       }
//     );
//   }
// };

// exports.canUpdateDeleteLink = (req, res, next) => {
//   const { id } = req.params;
//   Link.findOne({ _id: id }).exec((err, data) => {
//     if (err) {
//       return res.status(400).json({
//         error: "Could not find link",
//       });
//     }
//     let authorizedUser =
//       data.postedBy._id.toString() === req.user._id.toString();
//     if (!authorizedUser) {
//       return res.status(400).json({
//         error: "You are not authorized",
//       });
//     }
//     next();
//   });
// };

//// Create a google calendar refresh token and store it to MongoDB.
exports.createToken = async (req, res) => {
  try {
    const { code } = req.body;
    const response = await oauth2Client.getToken(code);

    if (response.res.status === 200) {
      const _id = req.auth._id;

      const { given_name, family_name, name, picture } = jwt.decode(
        response.tokens.id_token
      );
      User.findOneAndUpdate(
        { _id: _id },
        {
          refreshToken: response.tokens.refresh_token,
          accessToken: response.tokens.access_token,
          givenName: given_name ? given_name : "",
          familyName: family_name ? family_name : "",
          name: name ? name : "",
          picture: picture ? picture : "",
        },
        (err, success) => {
          if (err) {
            return res.status(400).json({
              error: "Error updating tokens to the database for users.",
            });
          }
          res.send("Authorization successful!");
        }
      );
    } else {
      return res.status(400).json({
        error: "Unsuccessful request to google calendar server!",
      });
    }
  } catch (e) {
    return res.status(400).json({
      error: "Error creating google calendar token!",
    });
  }
};

//Delete google calendar token in MongoDb
exports.deleteTokens = async (req, res) => {
  const { id } = req.params;

  User.findOneAndUpdate(
    { _id: id },
    {
      $unset: {
        refreshToken: "",
        accessToken: "",
        givenName: "",
        familyName: "",
        name: "",
        picture: "",
      },
    },
    (err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Error removing fields when removing google calendar token!",
        });
      }
      res.send("Remove google calendar token successful!");
    }
  );
};

// exports.passwordCheck = (req, res) => {
//   const { email, password } = req.body;
//   // console.table({ email, password });
//   User.findOne({ email }).exec((err, user) => {
//     if (err || !user) {
//       return res.status(400).json({
//         error: "User with that email does not exist",
//       });
//     }
//     // authenticate
//     if (!user.authenticate(password)) {
//       return res.status(400).json({
//         error: "Email and password do not match",
//       });
//     }
//     res.send("Approved!");
//   });
// };

// Update user with new password
exports.updateUser = (req, res) => {
  const { email, password, username, newPassword } = req.body;

  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist",
      });
    }

    // authenticate
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: "Email and password do not match",
      });
    }
    if (newPassword && newPassword !== "") {
      user.password = newPassword;
    }
    user.username = username;

    user.save((err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Error updating user to the database",
        });
      }

      res.send("Approved!");
    });
  });
};

// Get array of sentFriendRequests, sentFriendRequests, and pendingFriendsRequest
exports.getAcceptedFriends = (req, res) => {
  User.findOne({ _id: req.auth._id })
    .select("sentFriendRequests acceptedFriends pendingFriendsRequest -_id")
    .populate("acceptedFriends", "username picture email -_id")
    .populate("sentFriendRequests", "username picture email -_id")
    .populate("pendingFriendsRequest", "username picture email -_id")
    .sort({ createdAt: -1 })
    .exec((err, friendsList) => {
      if (err) {
        return res.status(400).json({
          error: "Could not load friend list",
        });
      }

      res.json(friendsList);
    });
};

/// Search user in UserPublicInfo folder
exports.usersSearch = (req, res) => {
  const { searchTerm } = req.body;

  User.findOne({ _id: req.auth._id })
    .select("sentFriendRequests acceptedFriends pendingFriendsRequest -_id")
    .exec((err, friendsList) => {
      if (err) {
        return res.status(400).json({
          error: "Could not load friend list",
        });
      }

      const list_friends_added = friendsList.sentFriendRequests.concat(
        friendsList.acceptedFriends,
        friendsList.pendingFriendsRequest
      );

      if (searchTerm.includes("@")) {
        UserPublicInfo.find({
          email: new RegExp(searchTerm, "i"),
          owner: { $nin: list_friends_added },
        })
          .select("_id picture username email")
          .exec((err, data) => {
            if (err || !data) {
              return res.status(400).json({
                error: "Cannot find an email match",
              });
            }
            res.json(data);
          });
      } else {
        UserPublicInfo.find({
          username: new RegExp(searchTerm, "i"),
          owner: { $nin: list_friends_added },
        })
          .select("_id picture username email")
          .exec((err, data) => {
            if (err || !data) {
              return res.status(400).json({
                error: "Cannot find a username match",
              });
            }

            res.json(data);
          });
      }
    });
};

//// Add pending request to the friend that the current user want to add
exports.pendingFriends = (req, res) => {
  const { email } = req.body;

  //Add requested in the pendingFriendsRequest of the friend that the user wanted to add
  User.findOneAndUpdate(
    { email },
    { $addToSet: { pendingFriendsRequest: req.auth._id } }
  ).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "Friend with that email does not exist",
      });
    }

    //Remember the friend that has been sent
    User.findOneAndUpdate(
      { _id: req.auth._id },
      { $addToSet: { sentFriendRequests: user._id } }
    ).exec((err, ownerUser) => {
      if (err || !ownerUser) {
        return res.status(400).json({
          error: "User with your id does not exist",
        });
      }

      const notification = new Notification({
        seen: false,
        postedBy: req.auth._id,
        status: "active",
        sharedWith: [user._id],
        reminderTypes: "friendRequest",
        // remindedAt: new Date(new Date().setDate(new Date().getDate() + 2)),
      });

      //Save notification to mongoDB
      notification.save((err, notificationData) => {
        if (err) {
          return res.status(400).json({
            error: "Error in creating a new friend request notification.",
          });
        }

        res.send("Friend request sent!");
      });
    });
  });
};

exports.acceptedFriends = (req, res) => {
  const { email } = req.body;

  // Find the friend the user want to accept
  User.findOneAndUpdate(
    { email },
    {
      $pull: { sentFriendRequests: req.auth._id },
      $addToSet: { acceptedFriends: req.auth._id },
    }
  ).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "The friend with that email does not exist",
      });
    }

    //Change the user info
    User.findOneAndUpdate(
      { _id: req.auth._id },
      {
        $pull: { pendingFriendsRequest: user._id },
        $addToSet: { acceptedFriends: user._id },
      }
    ).exec((err, ownerUser) => {
      if (err || !ownerUser) {
        return res.status(400).json({
          error: "User does not exist",
        });
      }

      Notification.findOneAndUpdate(
        {
          reminderTypes: "friendRequest",
          postedBy: user._id,
          status: "active",
        },
        { status: "inactive" }
      ).exec((err, updated) => {
        if (err) {
          return res.status(400).json({
            error: "Error finding the friend request notification",
          });
        }

        res.send("Friend request sent!");
      });
    });
  });
};

//Decline friend request
exports.decliningFriends = (req, res) => {
  const { email } = req.body;

  // Find the friend the user want to accept
  User.findOneAndUpdate(
    { email },
    {
      $pull: { sentFriendRequests: req.auth._id },
    }
  ).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "Friend with that email does not exist",
      });
    }

    //Change the user info
    User.findOneAndUpdate(
      { _id: req.auth._id },
      {
        $pull: { pendingFriendsRequest: user._id },
      }
    ).exec((err, ownerUser) => {
      if (err || !ownerUser) {
        return res.status(400).json({
          error: "User with the ID does not exist",
        });
      }

      Notification.findOneAndUpdate(
        {
          reminderTypes: "friendRequest",
          postedBy: user._id,
          status: "active",
        },
        { status: "inactive" }
      ).exec((err, updated) => {
        if (err) {
          return res.status(400).json({
            error:
              "Error finding the friend request notification to inactivate.",
          });
        }

        res.send("Friend request sent!");
      });
    });
  });
};

//// Suggested friends from search word user entered
exports.getSuggestedFriends = (req, res) => {
  const { searchUser } = req.body;

  if (searchUser.includes("@")) {
    User.find({
      acceptedFriends: { $elemMatch: { $eq: req.auth._id } },
      email: new RegExp(searchUser, "i"),
    })
      .select("_id picture username email")
      .exec((err, data) => {
        if (err || !data) {
          return res.status(400).json({
            error: "Users with the email do not exist",
          });
        }
        res.json(data);
      });
  } else {
    User.find({
      acceptedFriends: { $elemMatch: { $eq: req.auth._id } },
      username: new RegExp(searchUser, "i"),
    })
      .select("_id picture username email")
      .exec((err, data) => {
        if (err || !data) {
          return res.status(400).json({
            error: "Users with the username do not exist",
          });
        }

        res.json(data);
      });
  }
};
