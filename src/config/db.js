const mongoose = require("mongoose");

function connectToDB() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to DB");
      process.exit(1); // agr server DB se connect nahi kar paya to server ko band kar do
    });
}

module.exports = connectToDB;
