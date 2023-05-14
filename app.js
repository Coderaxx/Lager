const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const fs = require("fs");

// Angi sti til den offentlige mappen
app.use(express.static(path.join(__dirname, "public")));

// Håndter GET-forespørsel for /add
app.get("/add", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "add-item.html"));
});

// Håndter GET-forespørsel for /delete
app.get("/delete", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "delete-item.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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

  for (const category of inventory.categories) {
    for (const shelf of category.shelves) {
      for (const section of shelf.sections) {
        for (const level of section.levels) {
          const items = level.items;

          if (Array.isArray(items)) {
            for (const item of items) {
              if (
                item.barcode === query ||
                `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase())
              ) {
                results.push({ location: `${category.name}.${shelf.name}.${section.name}.${level.name}`, ...item });
              }
            }
          } else {
            if (
              items.barcode === query ||
              `${items.brand} ${items.model}`.toLowerCase().includes(query.toLowerCase())
            ) {
              results.push({ location: `${category.name}.${shelf.name}.${section.name}.${level.name}`, ...items });
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
    res.status(200).json(results);
  } else {
    res.status(404).json({ message: "Ingen varer funnet" });
  }
});

app.get("/inventory", (req, res) => {
  const inventoryData = readInventoryFromFile();
  res.json(inventoryData);
});

app.post("/inventory", (req, res) => {
  const newItem = req.body;

  const { location } = newItem;
  const [category, shelf, section, level] = location.split(".");

  if (!inventory.categories) {
    inventory.categories = [];
  }

  let categoryObj = inventory.categories.find((c) => c.name === category);
  if (!categoryObj) {
    categoryObj = { name: category, shelves: [] };
    inventory.categories.push(categoryObj);
  }

  let shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
  if (!shelfObj) {
    shelfObj = { name: shelf, sections: [] };
    categoryObj.shelves.push(shelfObj);
  }

  let sectionObj = shelfObj.sections.find((s) => s.name === section);
  if (!sectionObj) {
    sectionObj = { name: section, levels: [] };
    shelfObj.sections.push(sectionObj);
  }

  let levelObj = sectionObj.levels.find((l) => l.name === level);
  if (!levelObj) {
    levelObj = { name: level, items: [] };
    sectionObj.levels.push(levelObj);
  }

  levelObj.items.push(newItem);

  saveInventoryToFile(inventory);

  res.status(201).json({ message: "Vare lagt til" });
});

app.get("/inventory/:location", (req, res) => {
  const { location } = req.params;
  const [category, shelf, section, level] = location.split(".");

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (categoryObj) {
    const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
    if (shelfObj) {
      const sectionObj = shelfObj.sections.find((s) => s.name === section);
      if (sectionObj) {
        const levelObj = sectionObj.levels.find((l) => l.name === level);
        if (levelObj) {
          res.json(levelObj.items);
          return;
        }
      }
    }
  }

  res.status(404).json({ message: "Plassering ikke funnet" });
});

app.delete("/inventory/:barcode", (req, res) => {
  const { barcode } = req.params;

  let itemFound = false;

  for (const categoryObj of inventory.categories) {
    for (const shelfObj of categoryObj.shelves) {
      for (const sectionObj of shelfObj.sections) {
        for (const levelObj of sectionObj.levels) {
          const itemIndex = levelObj.items.findIndex((item) => item.barcode === barcode);
          if (itemIndex !== -1) {
            levelObj.items.splice(itemIndex, 1);
            itemFound = true;
            break;
          }
        }
        if (itemFound) {
          break;
        }
      }
      if (itemFound) {
        break;
      }
    }
    if (itemFound) {
      break;
    }
  }

  if (itemFound) {
    saveInventoryToFile(inventory);
    res.json({ message: "Vare slettet" });
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