const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const fs = require("fs");

app.use(express.json());
app.use(express.static("public"));

let inventory = readInventoryFromFile();

function readInventoryFromFile() {
  try {
    const inventoryData = fs.readFileSync("inventory.json");
    return JSON.parse(inventoryData);
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
  const results = [];

  for (const category in inventory) {
    for (const shelf in inventory[category]) {
      for (const section in inventory[category][shelf]) {
        for (const level in inventory[category][shelf][section]) {
          for (const location in inventory[category][shelf][section][level]) {
            const items = inventory[category][shelf][section][level][location];

            if (Array.isArray(items)) {
              for (const item of items) {
                if (
                  item.barcode === query ||
                  `${item.merke} ${item.modell}`.toLowerCase().includes(query.toLowerCase())
                ) {
                  results.push({ location: `${category}.${shelf}.${section}.${level}.${location}`, ...item });
                }
              }
            }
          }
        }
      }
    }
  }

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

app.get("/inventory", (req, res) => {
  const inventoryData = readInventoryFromFile();
  res.json(inventoryData);
});

app.post("/inventory", (req, res) => {
  const { location, item } = req.body;

  const [category, shelf, section, level] = location.split(".");

  if (!inventory[category]) {
    inventory[category] = {};
  }

  if (!inventory[category][shelf]) {
    inventory[category][shelf] = {};
  }

  if (!inventory[category][shelf][section]) {
    inventory[category][shelf][section] = {};
  }

  if (!inventory[category][shelf][section][level]) {
    inventory[category][shelf][section][level] = [];
  }

  inventory[category][shelf][section][level].push(item);

  saveInventoryToFile(inventory);

  res.status(201).json({ message: "Vare lagt til" });
});

app.get("/inventory/:location", (req, res) => {
  const { location } = req.params;
  const [category, shelf, section, level] = location.split(".");

  if (
    inventory[category] &&
    inventory[category][shelf] &&
    inventory[category][shelf][section] &&
    inventory[category][shelf][section][level]
  ) {
    res.json(inventory[category][shelf][section][level]);
  } else {
    res.status(404).json({ message: "Plassering ikke funnet" });
  }
});

app.delete("/inventory/:barcode", (req, res) => {
  const { barcode } = req.params;

  const results = searchInventory(barcode);

  console.log(barcode, results);

  if (results.length > 0) {
    const [item] = results;
    const { location } = item;
    const [category, shelf, section, level, locationIndex] = location.split(".");
    
    if (inventory[category]?.[shelf]?.[section]?.[level]?.[locationIndex]) {
      inventory[category][shelf][section][level][locationIndex] = inventory[category][shelf][section][level][locationIndex].filter(item => item.barcode !== barcode);

      saveInventoryToFile(inventory);

      res.json({ message: "Vare slettet" });
    } else {
      res.status(404).json({ message: "Vare ikke funnet" });
    }
  } else {
    res.status(404).json({ message: "Vare ikke funnet" });
  }
});

// Håndter feil ved 404-not found
app.use((req, res, next) => {
  res.status(404).json({ message: "Ressurs ikke funnet" });
});

// Håndter generelle feil
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Noe gikk galt på serveren" });
});