//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

const localPort = process.env.LOCALHOST_PORT;
const mongoDB_PWD = process.env.MONGO_DB_PWD;
const mongoDB_USR_N = process.env.MONGO_DB_USRName;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

function main() {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(
        "mongodb+srv://" +
          mongoDB_USR_N +
          ":" +
          mongoDB_PWD +
          "@cluster0.pqux9bb.mongodb.net/todolistDB"
      )

      .then(() => {
        const itemSchema = new mongoose.Schema({
          name: String,
        });
        const Item = mongoose.model("Item", itemSchema);

        const item1 = new Item({
          name: "Welcome to your to-do list.",
        });

        const item2 = new Item({
          name: "Click + to add a new item.",
        });

        const item3 = new Item({
          name: "Click <--- to delete an item.",
        });

        const defaultItems = [item1, item2, item3];

        const listSchema = new mongoose.Schema({
          name: String,
          items: [itemSchema],
        });
        const List = mongoose.model("List", listSchema);

        Item.find()
          .then((items) => {
            if (items.length === 0) {
              Item.insertMany(defaultItems)

                .then(() => {
                  resolve();
                })

                .catch(reject);
            } else {
              resolve();
            }
          })
          .catch(reject);

        setupRoutes(Item, List, defaultItems);
      })
      .catch(reject);
  });
}

function setupRoutes(Item, List, defaultItems) {
  app.get("/:customListName", function (req, res) {
    const customListName = req.params.customListName;
    const listName = _.capitalize(customListName);
    if (listName === "About") {
      res.render("about");
    } else {
      List.findOne({ name: listName })
        .then(function (foundList) {
          //Check if the list exists
          if (!foundList) {
            const list = new List({
              name: listName,
              items: defaultItems,
            });
            list.save();
            res.redirect("/" + listName);
          } else {
            if (foundList.length === 0) {
            } else {
              //if the list exists
              res.render("list", {
                listTitle: listName,
                newlistItems: foundList.items,
              });
            }
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

  app.get("/", function (req, res) {
    Item.find()
      .then(function (items) {
        res.render("list", { listTitle: "Today", newlistItems: items });
      })
      .catch(function (err) {
        console.log(err);
        res.status(500).send("Error occurred");
      });
  });

  app.post("/", function (req, res) {
    const item = req.body.newItem;
    const listName = req.body.list;
    const newTask = new Item({
      name: item,
    });

    if (listName === "Today") {
      if (item === "") {
        res.redirect("/");
      } else {
        newTask
          .save()
          .then(function () {
            res.redirect("/");
          })
          .catch(function (err) {
            console.log(err);
            res.status(500).send("Error occurred");
          });
      }
    } else {
      //if List name is different from default

      if (item === "") {
        res.redirect("/" + listName);
      } else {
        List.findOne({ name: listName })
          .then((foundList) => {
            foundList.items.push(newTask);
            foundList
              .save()
              .then(() => {
                console.log("New item added: ", item);
                res.redirect("/" + listName);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).send("Error occurred");
              });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send("Error occurred");
          });
      }
    }
  });

  app.post("/delete", function (req, res) {
    const checkedItem = req.body.checkbox;

    let checkedItemArr = [];
    checkedItem.forEach((element) => {
      checkedItemArr = element.split("  ");
    });

    if (checkedItemArr[0] === "Today") {
      //checkedItemArr[0] is List Name
      //Default List deletion
      Item.findByIdAndRemove(checkedItemArr[1]) //checkedItemArr[1] is the item ID thats checked
        .then(function () {
          res.redirect("/");
        })
        .catch(function (err) {
          console.log(err);
          res.status(500).send("Error occurred");
        });
    } else {
      //If the List is different from the default list

      List.findOneAndUpdate(
        { name: checkedItemArr[0] },
        { $pull: { items: { _id: checkedItemArr[1] } } }
      )
        .then((foundList) => {
          res.redirect("/" + checkedItemArr[0]);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send("Error occurred");
        });
    }
  });

  app.get("/about", function (req, res) {
    res.render("about");
  });

  app.listen(3000, function () {
    console.log("Server started on port", localPort);
  });
}

main()
  .then(() => {
    console.log("Mongoose connection established");
  })

  .catch((err) => {
    console.log(err);
    console.log("Error connecting to MongoDB");
  });
