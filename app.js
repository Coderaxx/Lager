const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const fs = require("fs");

app.use(express.static("public"));
app.use(express.json());

let inventory = readInventoryFromFile();

function readInventoryFromFile() {
  try {
    const data = fs.readFileSync("inventory.json", "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading inventory file:", error);
    return {};
  }
}

function saveInventoryToFile(inventory) {
  try {
    fs.writeFileSync("inventory.json", JSON.stringify(inventory, null, 2));
  } catch (error) {
    console.error("Error writing inventory file:", error);
  }
}

function searchInventory(query) {
  const results = Object.values(inventory).flatMap((category) => {
    return Object.values(category).flatMap((section) => {
      return Object.values(section).flatMap((level) => {
        return Object.entries(level).map(([location, item]) => {
          return { location, ...item };
        });
      });
    });
  }).filter(item => {
    if (item.barcode === query) {
      return true;
    }

    const searchStr = `${item.brand} ${item.model}`.toLowerCase();
    return searchStr.includes(query.toLowerCase());
  });

  return results;
}

app.get("/inventory/search/:query", (req, res) => {
  const { query } = req.params;

  const results = searchInventory(query);

  if (results.length > 0) {
    res.json(results);
  } else {
    res.status(404).json({ message: "Ingen varer funnet" });
  }
});

app.post("/inventory/:category/:section/:level", (req, res) => {
  const { category, section, level } = req.params;
  const location = `H${category}.${section}.${level}`;

  inventory[category] = inventory[category] || {};
  inventory[category][section] = inventory[category][section] || {};
  inventory[category][section][level] = inventory[category][section][level] || {};

  const item = req.body;
  inventory[category][section][level][location] = item;

  res.status(201).json({ message: "Vare lagt til", location, item });

  saveInventoryToFile(inventory);
});