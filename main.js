const {app, BrowserWindow, remote} = require('electron');
const path = require('path');
const {ipcMain, screen} = require('electron');
var mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 172,
    height: 800,
    minWidth:172,
    icon: "./icon.png",
    maximizable:false,
    transparent:true,
    frame:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration:true
    }
  })

  mainWindow.loadFile('index.html');
  
  fullCardWindow = new BrowserWindow({
    width:340,
    height:512,
    maximizable:false,
    transparent:true,
    skipTaskbar:true,
    frame:false,
    focusable:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration:true
    }
  })
  fullCardWindow.loadFile("./previewCard.html");

  graveyardWindow = new BrowserWindow({
    width: 172,
    height: 800,
    minWidth:172,
    icon: "./icon.png",
    maximizable:false,
    transparent:true,
    frame:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration:true
    }
  })

  graveyardWindow.loadFile('graveyard.html');

  graveyardWindow.webContents.on('did-finish-load', () => {
    graveyardWindow.setVisibleOnAllWorkspaces(true);
    graveyardWindow.setAlwaysOnTop(true, 'screen-saver');

    graveyardWindow.on('resize', () => {
      var size = mainWindow.getSize();
      graveyardWindow.webContents.send('resize', size[0], size[1]);
    });
  });
  
  fullCardWindow.webContents.on('did-finish-load', () => {
    fullCardWindow.setVisibleOnAllWorkspaces(true);
    fullCardWindow.setAlwaysOnTop(true, 'screen-saver');
    fullCardWindow.setIgnoreMouseEvents(true);
    fullCardWindow.hide();
  })

  

  ipcMain.on('preview', (event, src, x, y, isMainTracker) => {
    let windowPosition;
    let windowSize;

    if (isMainTracker) {
      windowPosition = mainWindow.getPosition();
      windowSize = mainWindow.getSize();
    }
    else {
      windowPosition = graveyardWindow.getPosition();
      windowSize = graveyardWindow.getSize();
    }

    if (windowPosition[0] > screen.getPrimaryDisplay().workAreaSize.width / 2) { // config
      fullCardWindow.setPosition(windowPosition[0] - 340, windowPosition[1] - 210 + y); 
    }
    else {
      fullCardWindow.setPosition(windowPosition[0] + windowSize[0], windowPosition[1] - 210 + y); 
    }

    fullCardWindow.webContents.send('preview', src, x, y);
    fullCardWindow.show();
  });

  ipcMain.on('unpreview', (event) => {
    fullCardWindow.hide();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    mainWindow.on('resize', () => {
      var size = mainWindow.getSize();
      mainWindow.webContents.send('resize', size[0], size[1]);
    });

    httpGet(url).then(res => waitingForGame(res));
  });
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

const axios = require('axios');


async function httpGet(theUrl)
{
  try {
    let res = await axios({
         url: theUrl,
         method: 'get'
         }
     );
     return res.data
 }
 catch (err) {
     console.error(err);
 }
}

// Necessary for graveyard (maybe)

var url = "http://127.0.0.1:21337/positional-rectangles";
var setJson = require('./set1-en_us.json');
var prevDraw;
var cardsLeft;
var height;
var handSize;
var currentRectangles = [];
global.decklist = [];
global.graveyardArr = [];
global.opponentDeckArr = [];


function waitingForGame(r) {
  console.log("Waiting");

  if (!r) {
    setTimeout(function() {httpGet(url).then(res => waitingForGame(res));}, 500);
    console.log("r NOT EXIST1");
  }
  else {
    if ((r.GameState) === ('InProgress')) {
      prevDraw = null;
      cardsLeft = 40;
      height = r.Screen.ScreenHeight;
      httpGet("http://127.0.0.1:21337/static-decklist").then(res => matchFound(res));
    }
    else
      setTimeout(function() {httpGet(url).then(res => waitingForGame(res));}, 5000);
  }
}

function matchFound(r) {
  if (!r) {
    console.log("r NOT EXIST2");
    setTimeout(function() {httpGet(url).then(res => waitingForGame(res));}, 500);
  }

  global.decklist = r.CardsInDeck;
  global.graveyardArr = [];
  global.opponentDeckArr = [];
  currentRectangles = [];

  mainWindow.show();
  
  size = mainWindow.getSize();
  mainWindow.webContents.send('start', size[0], size[1]);

  handSize = 4;
  mainWindow.webContents.send('handUpdate', handSize);

  console.log("Waiting for Mulligan");
  httpGet(url).then(res => waitingForMulligan(res));
}

function waitingForMulligan(r) { //Mulligan  
  if (!r) {
    console.log("r NOT EXIST3");
    setTimeout(function() {httpGet(url).then(res => waitingForGame(res));}, 500);
  }
  var card = null;
  var firstCard = null;
  
  for (let element of r.Rectangles) {
    if ((element.Height > height / 2 - 10) && (element.Height < height / 2 + 10)) {
      card = element;
      firstCard = element.CardID;
      break;
    }
  };

  if (card == null) {
    setTimeout(function() {httpGet(url).then(res => waitingForMulligan(res));}, 1000);
  }
  else { // First Draw

    prevDraw = card;
    
    for (let element of r.Rectangles) {

      if ((element.CardCode !== ("face")) && (element.LocalPlayer) && (element.CardID !== firstCard)) {
        cardsLeft--;
        
        if (element.type === "Unit") 
          mainWindow.webContents.send('update', element.CardCode, true);
        else
          mainWindow.webContents.send('update', element.CardCode, false);
      }
    };

    console.log("Tracking Game");

    httpGet(url).then(res => trackingGame(res));
  }
}

function trackingGame(r) {
  if (!r) {
    console.log("r NOT EXIST 4")
    setTimeout(function() {httpGet(url).then(res => waitingForGame(res));}, 500);
  }

  var tempHandSize = 0;
  let tempCurrentRectangles = [];

  if (r.GameState !== ("InProgress")) {
    httpGet("http://127.0.0.1:21337/game-result").then(res => matchOver(res));
  }
  else {
    for (let element of r.Rectangles) {
      if (element.CardCode !== "face") {
        tempCurrentRectangles.push({"CardID": element.CardID, "CardCode": element.CardCode, "LocalPlayer": element.LocalPlayer});
      }

      if ((element.TopLeftY < height * 0.17)) {
        tempHandSize++;
      }
      if ((element.Height > height / 2 - 10) && (element.Height < height / 2 + 10)) {
        card = element;
        break;
      }
    };
    
    if (currentRectangles !== tempCurrentRectangles && tempHandSize !== 0) {
      for (let element of currentRectangles) {
        if ( !tempCurrentRectangles.find(o => o.CardID === element.CardID)) {//!tempCurrentRectangles.includes(element)) {
          let card = setJson.find(o => o.cardCode === element.CardCode);

          if (card.type === "Unit" || card.type === "Spell") {
            if (graveyardArr.find(o => o.cardCode === element.CardCode && o.localPlayer === element.LocalPlayer)) {
              let existingCard = graveyardArr.find(o => o.cardCode === element.CardCode);
              if (!existingCard.IDs.includes(element.CardID)) {
                existingCard.quantity++;
                existingCard.IDs.push(element.CardID)
              }
            }
            else {
              graveyardArr.push({
                "cardCode": card.cardCode,
                "mana": card.cost,
                "quantity": 1,
                "imageUrl": null,
                "name": card.name,
                "region": card.regionRef,
                "localPlayer": element.LocalPlayer,
                "type": card.type,
                "IDs": [element.CardID]
              });
            }
          }
          graveyardWindow.webContents.send('update', "test");
        }
      }

      currentRectangles = tempCurrentRectangles;
    }


    if (card != null && card.CardID !== prevDraw) {
      prevDraw = card.CardID;
      cardsLeft--;
      if (card.type === "Unit") 
        mainWindow.webContents.send('update', card.CardCode, true);
      else
        mainWindow.webContents.send('update', card.CardCode, false);
    }

    if (handSize !== tempHandSize && tempHandSize !== 0) {
      handSize = tempHandSize;
      mainWindow.webContents.send('handUpdate', handSize);
    }

    setTimeout(function() {httpGet(url).then(res => trackingGame(res));}, 1000);
  }
}

function matchOver(r) {
  if (!r)
    httpGet(url).then(res => waitingForGame(res));


  if (r.LocalPlayerWon)
    console.log("Victory");
  else
    console.log("Defeat");

  mainWindow.hide();
  
  httpGet(url).then(res => waitingForGame(res));
}