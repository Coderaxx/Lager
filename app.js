const express = require("express");
const subdomain = require('express-subdomain');
const myApp = express();
const PORT = process.env.PORT || 5000;
const path = require("path");
const fs = require("fs");
const Sentry = require("@sentry/node");
const { v4: uuidv4 } = require('uuid');
const { ComputerVisionClient } = require("@azure/cognitiveservices-computervision");
const { ApiKeyCredentials } = require("@azure/ms-rest-js");

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

myApp.sub = express.Router();
myApp.use(subdomain('admin', myApp.sub));

myApp.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

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

//Send @azure/cognitiveservices-computervision node modulen til klienten
myApp.get("/azure", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "@azure", "cognitiveservices-computervision", "dist", "cognitiveservices-computervision.min.js"));
});

//Send @azure/ms-rest-js node modulen til klienten
myApp.get("/ms-rest-js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "@azure", "ms-rest-js", "dist", "msRest.browser.js"));
});

//Send axios node modulen til klienten
myApp.get("/axios", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "axios", "dist", "axios.min.js"));
});

//Send uuid node modulen til klienten
myApp.get("/uuid", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules", "uuid", "dist", "v4.js"));
});

myApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

myApp.use('/lib/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

myApp.use(express.json());
myApp.use(express.static("public"));

/*let inventory = readInventoryFromFile();
let inventory = getInventoryFromDatabase().then((result) => {
  inventory = result[0];
});*/
let inventory = null;

/**
 * Asynchronously updates the inventory by fetching it from the database. 
 *
 * @return {Promise<void>} Returns a Promise that resolves with no value when the update is complete.
 */
async function updateInventory() {
  try {
    const result = await getInventoryFromDatabase();
    inventory = result[0];
    //console.log("Lageret er oppdatert");
  } catch (error) {
    console.error("Feil ved oppdatering av lageret:", error);
  }
}

// Oppdater lageret umiddelbart
updateInventory();

// Oppdater lageret hvert 5. sekund
setInterval(updateInventory, 5000);

/**
 * Reads the inventory data from a JSON file and returns it as a JavaScript object.
 *
 * @return {Object} An object representing the inventory data.
 * @throws {Error} If there is an error reading the inventory file.
 */
async function readInventoryFromFile() {
  try {
    const inventoryData = fs.readFileSync("inventory.json");

    return JSON.parse(inventoryData);
  } catch (error) {
    console.error("Error reading inventory file:", error);
    Sentry.captureException(error);
    return {};
  }
}

async function getInventoryFromDatabase() {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const result = await collection.find({}).toArray();
    if (!result) {
      console.error('No inventory data found in MongoDB.');
      return null;
    }

    client.close();

    return result;

  } catch (error) {
    console.error('Error getting inventory data from MongoDB:', error);
    Sentry.captureException(error);
    return null;
  }
}

//Create a function that adds or removes a location in the database
async function addOrRemoveLocation(location, type) {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    if (type === 'add') {
      const result = await collection.insertOne({ name: location, shelves: [] });
      if (!result) {
        console.error(`Error adding location '${location}' to MongoDB.`);
        return null;
      }
      console.log(`Successfully added location '${location}' to MongoDB.`);
      return result;
    } else if (type === 'remove') {
      const result = await collection.deleteOne({ name: location });
      if (!result) {
        console.error(`Error removing location '${location}' from MongoDB.`);
        return null;
      }
      console.log(`Successfully removed location '${location}' from MongoDB.`);
      return result;
    } else {
      console.error(`Unknown type '${type}' for addOrRemoveLocation.`);
      return null;
    }
  } catch (error) {
    console.error(`Error ${type === 'add' ? 'adding' : 'removing'} location '${location}' from MongoDB:`, error);
    Sentry.captureException(error);
    return null;
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

async function saveInventoryToDatabase(shelfName, levelName, item) {
  console.log('Saving inventory data to MongoDB...');
  try {
    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const query = { 'shelves.name': shelfName };
    const shelfProjection = { 'shelves.$': 1 };

    const result = await collection.findOne(query, { projection: shelfProjection });
    if (!result || !result.shelves || result.shelves.length === 0) {
      console.error(`Shelf '${shelfName}' not found.`);
      return;
    }

    const shelf = result.shelves[0];
    const level = shelf.levels.find(l => l.name === levelName);
    if (!level) {
      console.error(`Level '${levelName}' not found in shelf '${shelfName}'.`);
      return;
    }

    const newItem = {
      ...item
    };

    level.items.push(newItem);

    const updateQuery = { 'shelves.name': shelfName };
    const updateData = { $set: { 'shelves.$': shelf } };

    await collection.updateOne(updateQuery, updateData);

    console.log(`Item with ID '${newItem._id}' saved to inventory.`);

    client.close();
  } catch (error) {
    console.error('Error saving inventory data to MongoDB:', error);
    Sentry.captureException(error);
  }
}

async function deleteItemFromDb(itemId) {
  try {
    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const query = { 'shelves.levels.items._id': itemId };
    const updateData = { $pull: { 'shelves.$[].levels.$[].items': { _id: itemId } } };

    const result = await collection.updateOne(query, updateData);

    if (result.modifiedCount > 0) {
      console.log(`Item with ID '${itemId}' deleted from inventory.`);
    } else {
      console.log(`Item with ID '${itemId}' not found in inventory.`);
    }

    client.close();
  } catch (error) {
    console.error('Error deleting item from inventory:', error);
    Sentry.captureException(error);
  }
}

function searchInventory(query) {
  const results = [];
  const visitedLocations = new Set();

  const getCountOfItem = (item, items) => {
    if (Array.isArray(items)) {
      return items.filter((i) => i.barcode === item.barcode).length;
    }
    return 1;
  };

  for (const category of inventory.shelves) {
    for (const shelf of category.levels) {
      const items = shelf.items;

      if (Array.isArray(items)) {
        const itemLocation = `H21.${category.name}${shelf.name}`;

        if (!visitedLocations.has(itemLocation)) {
          visitedLocations.add(itemLocation);

          const uniqueItemsInLocation = new Set();

          for (const item of items) {
            if (
              query &&
              (item.barcode === query ||
                item.articleNumber === query ||
                `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) ||
                itemLocation === query || 
                `${item.tags}`.toLowerCase().includes(query.toLowerCase()))
            ) {
              const itemKey = item.barcode;

              if (!uniqueItemsInLocation.has(itemKey)) {
                uniqueItemsInLocation.add(itemKey);
                results.push({
                  _id: item._id,
                  barcode: item.barcode,
                  location: itemLocation,
                  ...item,
                  quantity: getCountOfItem(item, items),
                });
              }
            }
          }
        }
      } else {
        const itemLocation = `H21.${category.name}${shelf.name}`;
        const item = items;

        if (
          query &&
          (item.barcode === query ||
            item.articleNumber === query ||
            `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) ||
            itemLocation === query || 
            `${item.tags}`.toLowerCase().includes(query.toLowerCase()))
        ) {
          const itemKey = item.barcode;

          if (!visitedLocations.has(itemLocation)) {
            visitedLocations.add(itemLocation);
            results.push({
              _id: item._id,
              barcode: item.barcode,
              location: itemLocation,
              ...item,
              quantity: getCountOfItem(item, items),
            });
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

myApp.get("/inventory", async (req, res) => {
  //const inventoryData = readInventoryFromFile();
  const inventoryData = await getInventoryFromDatabase();
  res.json(inventoryData);
});

myApp.get("/getTags/:url", async (req, res) => {
  const { url } = req.params;
  try {
    const tags = await getImageTags(url);
    res.json({ tags });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

myApp.post("/inventory/:location", (req, res) => {
  const newItem = req.body;
  const { location } = req.params;
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.slice(0, -1);
  const level = shelfLevel.slice(-1);

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

  newItem.location = `H21.${shelf}${level}`;
  newItem._id = uuidv4();
  levelObj.items.push(newItem);

  saveInventoryToDatabase(shelf, level, newItem);
  saveInventoryToFile(inventory);

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
  const shelf = locationParts[1];
  const level = locationParts[2];

  const shelfObj = inventory.shelves.find((s) => s.name === shelf);
  if (shelfObj) {
    const levelObj = shelfObj.levels.find((l) => l.name === level);
    if (levelObj) {
      res.json(levelObj.items);
      return;
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

myApp.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;
  //Funksjon for håndtering av sletting av vare basert på id. Vi skal slette varen fra databasen og fra inventory.json.
  //Vi skal også håndtere eventuelle feil som kan oppstå.
  //Husk å sende riktig statuskode tilbake til klienten.
  const item = deleteItemFromDb(id);
  if (item) {
    res.status(200).json({ message: "Vare slettet" });
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

async function getImageTags(url) {
  // Angi nødvendige detaljer for å koble til Azure Computer Vision API
  const { ComputerVisionClient } = require("@azure/cognitiveservices-computervision");
  const { ApiKeyCredentials } = require("@azure/ms-rest-js");

  const visionEndpoint = 'https://coderaxai.cognitiveservices.azure.com/';
  const visionApiKey = 'f507ec85db794fdbac771c26e9681ae6';

  // Opprett en instans av ComputerVisionClient
  const visionCredentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': visionApiKey } });
  const visionClient = new ComputerVisionClient(visionCredentials, visionEndpoint);

  // Funksjon for å hente ut tagger fra et bilde
  async function getTagsFromImage(imageUrl) {
    const tags = await visionClient.tagImage(imageUrl);
    return tags.tags.map((tag) => tag.name);
  }

  // Funksjon for å oversette en tekststreng fra engelsk til norsk
  async function translateText(text) {
    const { v4: uuidv4 } = require('uuid');
    const axios = require('axios').default;

    // Angi nødvendige detaljer for å koble til Azure Translator Text API
    const translatorEndpoint = 'https://api.cognitive.microsofttranslator.com';
    const translatorApiKey = '0ff5b82db33443a0a7421e0c589960ad';
    let location = "eastus";

    const request = {
      baseURL: translatorEndpoint,
      url: '/translate',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': translatorApiKey,
        'Ocp-Apim-Subscription-Region': location,
        'Content-Type': 'application/json',
        'X-ClientTraceId': uuidv4().toString()
      },
      params: {
        'api-version': '3.0',
        'from': 'en',
        'to': 'nb'
      },
      data: [{
        'text': text
      }],
      responseType: 'json'
    };

    try {
      const response = await axios(request);
      return response.data[0].translations[0].text;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Bruk funksjonene for å hente ut tagger fra et bilde og oversette dem
  const tags = await getTagsFromImage(url);
  console.log('Engelske tagger:', tags);

  const translatedTags = await Promise.all(tags.map(translateText));
  console.log('Norske tagger:', translatedTags);
  return translatedTags;
}