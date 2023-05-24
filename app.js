const express = require("express");
const myApp = express();
const PORT = process.env.PORT || 5000;
const path = require("path");
const fs = require("fs");
const Sentry = require("@sentry/node");
const jquery = require("jquery");
const { v4: uuidv4 } = require('uuid');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://coderax:BurlroaD50!@cluster0.xlok50g.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("Inventory").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

Sentry.init({
  dsn: "https://3c602fc817b942cbaf82608c5d9450fe@o4505183347081216.ingest.sentry.io/4505183347081216",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.0,
});

// Angi sti til den offentlige mappen
myApp.use(express.static(path.join(__dirname, "public")));

// Håndter GET-forespørsel for /add
myApp.get("/add", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "add-item.html"));
});

// Håndter GET-forespørsel for /delete
myApp.get("/delete", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "delete-item.html"));
});

myApp.get("/location", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "locations.html"));
});

myApp.get("/all", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "all.html"));
});

myApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

myApp.use('/lib/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

myApp.use(express.json());
myApp.use(express.static("public"));

let inventory = readInventoryFromFile();

function readInventoryFromFile() {
  try {
    const inventoryData = fs.readFileSync("inventory.json");
    return JSON.parse(inventoryData);
  } catch (error) {
    console.error("Error reading inventory file:", error);
    Sentry.captureException(error);
    return {};
  }
}

async function saveInventoryToFile(inventory) {
  try {
    fs.writeFileSync("inventory.json", JSON.stringify(inventory, null, 2));
  } catch (error) {
    console.error("Error writing inventory file:", error);
    Sentry.captureException(error);
  }
}

async function saveInventoryToDatabase(inventory) {
  console.log(JSON.stringify(inventory));
  try {
    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    for (const shelf of inventory.categories.shelves) {
      for (const level of shelf.levels) {
        for (const item of level.items) {
          const newItem = {
            location: `${shelf.name}.${level.name}`,
            ...item
          };

          await collection.insertOne(newItem);

          console.log('Item saved:', newItem);
        }
      }
    }

    console.log('Inventory data saved to MongoDB.');

    client.close();
  } catch (error) {
    console.error('Error saving inventory data to MongoDB:', error);
    Sentry.captureException(error);
  }
}

function searchInventory(query) {
  const results = [];
  const visitedItems = new Set();
  const visitedLocations = new Set();

  const getCountOfItem = (item, items) => {
    if (Array.isArray(items)) {
      return items.filter((i) => JSON.stringify(i) === JSON.stringify(item)).length;
    }
    return 1;
  };

  for (const category of inventory.categories) {
    for (const shelf of category.shelves) {
      for (const level of shelf.levels) {
        const items = level.items;

        if (Array.isArray(items)) {
          const itemLocation = `${category.name}.${shelf.name}.${level.name}`;
          const uniqueItemsInLocation = new Set();

          for (const item of items) {
            const itemKey = JSON.stringify(item);

            if (
              (query && (item.barcode === query || item.articleNumber === query || `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) || `${category.name}.${shelf.name}${level.name}` === query))
            ) {
              if (!visitedItems.has(itemKey) && !uniqueItemsInLocation.has(itemKey)) {
                visitedItems.add(itemKey);
                uniqueItemsInLocation.add(itemKey);
                results.push({ barcode: item.barcode, location: itemLocation, ...item, quantity: getCountOfItem(item, items) });
              }
            }
          }
        } else {
          const itemLocation = `${category.name}.${shelf.name}.${level.name}`;
          const item = items;
          const itemKey = JSON.stringify(item);

          if (
            (query && (item.barcode === query || item.articleNumber === query || `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) || `${category.name}.${shelf.name}${level.name}` === query))
          ) {
            if (!visitedItems.has(itemKey) && !visitedLocations.has(itemLocation)) {
              visitedItems.add(itemKey);
              visitedLocations.add(itemLocation);
              results.push({ barcode: item.barcode, location: itemLocation, ...item, quantity: getCountOfItem(item, items) });
            }
          }
        }
      }
    }
  }

  return results;
}

// Håndter GET-forespørsel for /locations
myApp.get("/locations", (req, res) => {
  const inventoryData = readInventoryFromFile();
  const locations = getAllLocations(inventoryData);
  res.json(locations);
});

// Håndter POST-forespørsel for /add-location
myApp.post("/add-location", (req, res) => {
  const { category, shelf, level } = req.body;

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (!categoryObj) {
    inventory.categories.push({ name: category, shelves: [] });
  }

  const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
  if (!shelfObj) {
    categoryObj.shelves.push({ name: shelf, levels: [] });
  }

  const levelObj = shelfObj.levels.find((l) => l.name === level);
  if (!levelObj) {
    shelfObj.levels.push({ name: level, items: [] });
  }

  saveInventoryToFile(inventory);

  res.redirect("/locations");
});

// Håndter GET-forespørsel for /remove-location
myApp.get("/remove-location/:location", (req, res) => {
  const { location } = req.params;
  const [category, shelf, level] = location.split(".");

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (categoryObj) {
    const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
    if (shelfObj) {
      const levelObj = shelfObj.levels.find((l) => l.name === level);
      if (levelObj) {
        // Fjern plasseringen fra inventory.json
        shelfObj.levels = shelfObj.levels.filter((l) => l.name !== level);
        saveInventoryToFile(inventory);
        res.redirect("/locations");
        return;
      }
    }
  }

  res.status(404).json({ message: "Plassering ikke funnet" });
});

myApp.get("/inventory/search/:query", (req, res) => {
  const { query } = req.params;

  const results = searchInventory(query);

  if (results.length > 0) {
    res.status(200).json(results);
  } else {
    res.status(404).json({ message: `Ingen varer funnet i søk etter ${query}` });
  }
});

myApp.get("/inventory", (req, res) => {
  const inventoryData = readInventoryFromFile();
  res.json(inventoryData);
});

myApp.post("/inventory/:location", (req, res) => {
  const newItem = req.body;
  const { location } = req.params;
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.charAt(0);
  const level = shelfLevel.substr(1);

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
    shelfObj = { name: shelf, levels: [] };
    categoryObj.shelves.push(shelfObj);
  }

  let levelObj = shelfObj.levels.find((l) => l.name === level);
  if (!levelObj) {
    levelObj = { name: level, items: [] };
    shelfObj.levels.push(levelObj);
  }

  newItem.location = location;
  levelObj.items.push(newItem);

  saveInventoryToFile(inventory);
  saveInventoryToDatabase(inventory);

  res.status(201).json({ message: "Vare lagt til" });
});

// Håndter GET-forespørsel for /inventory/:location
myApp.get("/inventory/:location", (req, res) => {
  let { location } = req.params;

  // Sjekk om plasseringen er i ønsket format, ellers konverter den
  if (!isValidLocationFormat(location)) {
    location = convertToFullLocationFormat(location);
  }

  const locationParts = location.split(".");
  const category = locationParts[0];
  const shelf = locationParts[1];
  const level = locationParts[2];

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (categoryObj) {
    const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
    if (shelfObj) {
      const levelObj = shelfObj.levels.find((l) => l.name === level);
      if (levelObj) {
        res.json(levelObj.items);
        return;
      }
    }
  }

  res.status(404).json({ message: "Plassering ikke funnet" });
});

// Hjelpefunksjon for å sjekke om en plassering er i ønsket format
function isValidLocationFormat(location) {
  const regex = /^[A-Z]+\d+\.[A-Z]+\.\d+$/;
  return regex.test(location);
}

// Hjelpefunksjon for å konvertere en plassering til ønsket format
function convertToFullLocationFormat(location) {
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.charAt(0);
  const level = shelfLevel.substr(1);
  return `${category}.${shelf}.${level}`;
}

myApp.delete("/inventory/:barcode", (req, res) => {
  const { barcode } = req.params;

  let itemFound = false;

  for (const categoryObj of inventory.categories) {
    for (const shelfObj of categoryObj.shelves) {
      for (const levelObj of shelfObj.levels) {
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
    saveInventoryToFile(inventory);
    res.json({ message: "Vare slettet" });
  } else {
    res.status(404).json({ message: "Vare ikke funnet" });
  }
});

// Håndter feil ved 404-not found
myApp.use((req, res, next) => {
  res.status(404).json({ message: "Ressurs ikke funnet" });
});

// Håndter generelle feil
myApp.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Noe gikk galt på serveren" });
});

// Funksjon for å generere liste over plasseringer i inventory.json
function getAllLocations(inventoryData) {
  const locations = {};

  for (const category of inventoryData.categories) {
    for (const shelf of category.shelves) {
      if (!locations[shelf.name]) {
        locations[shelf.name] = {};
      }

      for (const level of shelf.levels) {
        if (!locations[shelf.name][level.name]) {
          locations[shelf.name][level.name] = [];
        }

        locations[shelf.name][level.name] = [...locations[shelf.name][level.name], ...level.items];
      }
    }
  }

  return locations;
}