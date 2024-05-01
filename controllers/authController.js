// const bcrypt = require("bcrypt");
const Request = require("../Models/Request");

const validateUserData = (data) => {
  const errors = {};
  const nameRegex = /^[a-zA-Z\s]+$/; // Only alphabets allowed
  const phoneNumberRegex = /^\d{11}$/; //phonenumber
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.(?:babcock\.edu\.ng|student\.babcock\.edu\.ng)$/; //only babcock email
  const identificationNumberRegex = /^20\/\d{4}(?:PG\d{2}|JB\d{2})?$/; //only babcock ids
  // const roleRegex = ['student', 'lecturer', 'admin']; //roles

  //full name
  if (!data.fullName || !nameRegex.test(data.fullName)) {
    errors.fullName = "Full name must contain only alphabets";
  }

  //email
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = "only Babcock personnel can create an account ";
  }

  //phonenumber
  if (!data.phoneNumber || !phoneNumberRegex.test(data.phoneNumber)) {
    errors.phoneNumeber = "invalid phone number";
  }

  //identification number
  if (
    !data.identificationNumber ||
    !identificationNumberRegex.test(data.identificationNumber)
  ) {
    errors.password = "invalid identification number";
  }
  return errors;
};

const showSignPage = (req, res) => {
  res.render('sign');
}

const signinPostController = async (req, res) => {
  //get the users identificationNumber
  //find where number is present
  //crosscheck with password
  //if true make session and send good message
  //else fire bad request message
  res.status(200).json({ message: "User successfully authenticated" });
};

const signupPostController = async (req, res) => {
  const errors = validateUserData(req.body);

  if (Object.keys(errors).length === 0) {
    const signUp = {
      type: "access",
      name: req.body.fullName,
      email: req.body.email,
      phone_number: req.body.phoneNumber,
      identification_number: req.body.identificationNumber,
    };

    const request = new Request(signUp);
    await request.add();

    res.status(201).json({ message: "user request made successully" });
  } else {
    res.status(400).json({ errors });
  }
};

module.exports = {
  showSignPage,
  signupPostController,
  signinPostController
};
