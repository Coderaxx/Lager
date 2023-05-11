const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const fs = require("fs");

app.use(express.static("public"));

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
  const results = Object.values(inventory).filter(item => {
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


app.post("/inventory/:shelf/:section/:level", (req, res) => {
  const { shelf, section, level } = req.params;
  const location = `H${shelf}.S${section}.E${level}`;

  inventory[location] = req.body;

  res.status(201).json({ message: "Item added", location, item: req.body });
});

app.listen(port, () => {
  console.log(`Inventory app listening at http://localhost:${port}`);
});
